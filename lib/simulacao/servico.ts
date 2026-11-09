import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarSimulacaoAoLead, type DependenciasEmail, type LeadParaEmail } from "@/lib/email/notificar";
import type { Database } from "@/types/database";
import { BUCKET_SIMULACOES, dadosSemLogos, gravarPdfSimulacao, removerArquivosSimulacao } from "./armazenar";
import { CONFIG_SIMULACAO } from "./config";
import { nomeArquivoSimulacao } from "./gatilho";
import { montarSimulacao } from "./regras";
import type { DadosCreditas, SimulacaoView } from "./tipos";

/**
 * Orquestra a simulação de um lead (docs/crm-spec.md §3.7). Cuida de tudo que
 * a rota não deve saber: de onde vêm nome/e-mail (do banco, nunca do cliente),
 * a data de reserva e a ordem de cada ação. Dependências injetadas para testar
 * sem rede, sem Chromium e sem banco.
 *
 * Três momentos, nesta ordem de vida do documento:
 * - prévia: gera o PDF e devolve, sem tocar em banco nem e-mail;
 * - anexar: gera, grava no bucket e registra `crm_simulacoes` (`anexado`).
 *   NENHUM e-mail sai aqui, em nenhuma etapa;
 * - enviar: lê do bucket o PDF JÁ gravado (nunca regera) e o envia no movimento.
 */

export interface DepsSimulacao {
  gerarPdf: (vm: SimulacaoView) => Promise<Buffer>;
  /**
   * Service role (bucket e crm_simulacoes) e Resend: criados só quando preciso. A prévia
   * não toca em nenhum dos dois, então não exige a chave de serviço.
   */
  admin: () => SupabaseClient<Database>;
  email: () => DependenciasEmail;
  agora: () => Date;
}

/** Erro com mensagem pronta para a tela e o status HTTP que a rota deve devolver. */
export class ErroSimulacao extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ErroSimulacao";
  }
}

export type ResultadoExecucao =
  | { acao: "previa"; pdf: Buffer; nomeArquivo: string }
  | { acao: "anexar"; simulacaoId: string; nomeArquivo: string };

export interface ResultadoEnvio {
  emailStatus: "enviado" | "falhou" | "sem-chave";
  erroEmail: string | null;
  simulacaoId: string;
}

/** Passada essa janela, uma trava de envio sem desfecho (função morta no meio) pode ser retomada. */
const JANELA_TRAVA_ENVIO_MS = 2 * 60 * 1000;

function hojeEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(agora);
}

function exigirFinanciamento(lead: LeadParaEmail) {
  if (lead.tipo !== "financiamento") {
    throw new Error("A simulação só vale para leads de financiamento.");
  }
}

export async function executarSimulacao(
  deps: DepsSimulacao,
  acao: "previa" | "anexar",
  lead: LeadParaEmail,
  dados: DadosCreditas,
  usuarioId: string,
): Promise<ResultadoExecucao> {
  exigirFinanciamento(lead);

  const vm = montarSimulacao(dados, CONFIG_SIMULACAO, {
    cliente: lead.nome,
    referencia: lead.protocolo,
    data: dados.data || hojeEmSaoPaulo(deps.agora()),
  });
  const pdf = await deps.gerarPdf(vm);
  const nomeArquivo = nomeArquivoSimulacao(lead.protocolo);

  if (acao === "previa") return { acao: "previa", pdf, nomeArquivo };

  const admin = deps.admin();
  const gravado = await gravarPdfSimulacao(admin, lead.id, pdf);
  if (!gravado.caminho) {
    throw new ErroSimulacao("Não foi possível anexar a simulação: o PDF não pôde ser gravado. Tente novamente.", 502);
  }
  const { data, error } = await admin
    .from("crm_simulacoes")
    .insert({
      lead_id: lead.id,
      storage_path: gravado.caminho,
      dados: dadosSemLogos(dados) as unknown as Record<string, unknown>,
      criado_por: usuarioId,
      email_status: "anexado",
    })
    .select("id")
    .single();
  if (error || !data) {
    // Costuma ser a migration 032 ainda não aplicada (o check antigo não aceita 'anexado').
    console.error("[simulacao] não foi possível registrar a simulação anexada:", error);
    await removerArquivosSimulacao(admin, [gravado.caminho]);
    throw new ErroSimulacao("Não foi possível anexar a simulação. Tente novamente; se persistir, avise o suporte.", 502);
  }
  return { acao: "anexar", simulacaoId: data.id, nomeArquivo };
}

type LinhaSimulacao = {
  id: string;
  storage_path: string;
  email_status: Database["public"]["Tables"]["crm_simulacoes"]["Row"]["email_status"];
};

/** A linha só vale se for DESTE lead: o id sozinho não prova nada. */
async function carregarLinha(admin: SupabaseClient<Database>, leadId: string, simulacaoId: string): Promise<LinhaSimulacao> {
  const { data, error } = await admin
    .from("crm_simulacoes")
    .select("id, storage_path, email_status")
    .eq("id", simulacaoId)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) {
    console.error("[simulacao] não foi possível ler a simulação:", error);
    throw new ErroSimulacao("Não foi possível localizar a simulação.", 500);
  }
  if (!data) throw new ErroSimulacao("Simulação não encontrada.", 404);
  return data;
}

async function lerPdfGravado(admin: SupabaseClient<Database>, caminho: string): Promise<Buffer> {
  try {
    const { data, error } = await admin.storage.from(BUCKET_SIMULACOES).download(caminho);
    if (error || !data) {
      console.error("[simulacao] não foi possível ler o PDF do bucket:", error);
      throw new ErroSimulacao("Não foi possível ler o PDF da simulação anexada.", 502);
    }
    return Buffer.from(await data.arrayBuffer());
  } catch (e) {
    if (e instanceof ErroSimulacao) throw e;
    console.error("[simulacao] exceção ao ler o PDF do bucket:", e);
    throw new ErroSimulacao("Não foi possível ler o PDF da simulação anexada.", 502);
  }
}

/** PDF já gravado de uma simulação do lead (a prévia do diálogo de mover). */
export async function obterPdfAnexado(
  deps: DepsSimulacao,
  lead: LeadParaEmail,
  simulacaoId: string,
): Promise<{ pdf: Buffer; nomeArquivo: string }> {
  exigirFinanciamento(lead);
  const admin = deps.admin();
  const linha = await carregarLinha(admin, lead.id, simulacaoId);
  return { pdf: await lerPdfGravado(admin, linha.storage_path), nomeArquivo: nomeArquivoSimulacao(lead.protocolo) };
}

/**
 * Envia ao lead o PDF já anexado, sem regerar. Recusa simulação de outro lead
 * (404) e já enviada (409). A trava contra clique duplo é `enviado_em`: o UPDATE
 * condicional o preenche antes de chamar o Resend e só uma chamada o consegue.
 * Ao final a linha recebe o desfecho; se não enviou, `enviado_em` volta a nulo
 * para "Tentar enviar de novo" usar a MESMA simulação.
 */
export async function enviarSimulacaoAnexada(
  deps: DepsSimulacao,
  lead: LeadParaEmail,
  simulacaoId: string,
): Promise<ResultadoEnvio> {
  exigirFinanciamento(lead);
  const admin = deps.admin();
  const linha = await carregarLinha(admin, lead.id, simulacaoId);
  if (linha.email_status === "enviado") {
    throw new ErroSimulacao("Esta simulação já foi enviada ao lead.", 409);
  }

  const agora = deps.agora();
  const limite = new Date(agora.getTime() - JANELA_TRAVA_ENVIO_MS).toISOString();
  const { data: travada, error: erroTrava } = await admin
    .from("crm_simulacoes")
    .update({ enviado_em: agora.toISOString() })
    .eq("id", simulacaoId)
    .eq("lead_id", lead.id)
    .neq("email_status", "enviado")
    .or(`enviado_em.is.null,enviado_em.lt.${limite}`)
    .select("id");
  if (erroTrava) {
    console.error("[simulacao] não foi possível travar o envio:", erroTrava);
    throw new ErroSimulacao("Não foi possível enviar a simulação. Tente novamente.", 500);
  }
  if (!travada || travada.length === 0) {
    throw new ErroSimulacao("O envio desta simulação já está em andamento.", 409);
  }

  const liberarTrava = async () => {
    const { error } = await admin.from("crm_simulacoes").update({ enviado_em: null }).eq("id", simulacaoId);
    if (error) console.error("[simulacao] não foi possível liberar a trava de envio:", error);
  };

  let pdf: Buffer;
  try {
    pdf = await lerPdfGravado(admin, linha.storage_path);
  } catch (e) {
    await liberarTrava();
    throw e;
  }

  const envio = await enviarSimulacaoAoLead(deps.email(), lead, pdf, nomeArquivoSimulacao(lead.protocolo));

  const { data: atualizada, error: erroAtualizar } = await admin
    .from("crm_simulacoes")
    .update({
      email_status: envio.status,
      resend_id: envio.resendId,
      enviado_em: envio.status === "enviado" ? agora.toISOString() : null,
    })
    .eq("id", simulacaoId)
    .select("id");
  if (erroAtualizar || !atualizada || atualizada.length === 0) {
    // O e-mail já saiu (ou falhou); só o histórico ficou desatualizado.
    console.error("[simulacao] não foi possível atualizar o histórico do envio:", erroAtualizar);
  }

  return { emailStatus: envio.status, erroEmail: envio.erro, simulacaoId };
}
