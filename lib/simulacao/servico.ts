import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarSimulacaoAoLead, type DependenciasEmail, type LeadParaEmail } from "@/lib/email/notificar";
import type { Database } from "@/types/database";
import { dadosSemLogos, gravarPdfSimulacao } from "./armazenar";
import { CONFIG_SIMULACAO } from "./config";
import { nomeArquivoSimulacao } from "./gatilho";
import { montarSimulacao } from "./regras";
import type { DadosCreditas, SimulacaoView } from "./tipos";

/**
 * Orquestra a simulação de um lead (docs/crm-spec.md §3.7). Cuida de tudo que
 * a rota não deve saber: de onde vêm nome/e-mail (do banco, nunca do cliente),
 * a data de reserva, e a ordem gravar -> enviar -> registrar. Dependências
 * injetadas para testar sem rede, sem Chromium e sem banco.
 */

export interface DepsSimulacao {
  gerarPdf: (vm: SimulacaoView) => Promise<Buffer>;
  /**
   * Service role (bucket e crm_simulacoes) e Resend: criados só no envio. A prévia
   * não toca em nenhum dos dois, então não exige a chave de serviço.
   */
  admin: () => SupabaseClient<Database>;
  email: () => DependenciasEmail;
  agora: () => Date;
}

export type ResultadoExecucao =
  | { acao: "previa"; pdf: Buffer; nomeArquivo: string }
  | {
      acao: "enviar";
      emailStatus: "enviado" | "falhou" | "sem-chave";
      erroEmail: string | null;
      /** false quando o PDF/linha de histórico não foram gravados (o e-mail seguiu mesmo assim). */
      registrado: boolean;
      simulacaoId?: string;
    };

function hojeEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(agora);
}

export async function executarSimulacao(
  deps: DepsSimulacao,
  acao: "previa" | "enviar",
  lead: LeadParaEmail,
  dados: DadosCreditas,
  usuarioId: string,
): Promise<ResultadoExecucao> {
  if (lead.tipo !== "financiamento") {
    throw new Error("A simulação só vale para leads de financiamento.");
  }

  const vm = montarSimulacao(dados, CONFIG_SIMULACAO, {
    cliente: lead.nome,
    referencia: lead.protocolo,
    data: dados.data || hojeEmSaoPaulo(deps.agora()),
  });
  const pdf = await deps.gerarPdf(vm);
  const nomeArquivo = nomeArquivoSimulacao(lead.protocolo);

  if (acao === "previa") return { acao: "previa", pdf, nomeArquivo };

  // O e-mail é o que importa: falha de storage/histórico vira aviso, não bloqueio.
  const admin = deps.admin();
  const gravado = await gravarPdfSimulacao(admin, lead.id, pdf);
  const envio = await enviarSimulacaoAoLead(deps.email(), lead, pdf, nomeArquivo);

  let simulacaoId: string | undefined;
  if (gravado.caminho) {
    const { data, error } = await admin
      .from("crm_simulacoes")
      .insert({
        lead_id: lead.id,
        storage_path: gravado.caminho,
        dados: dadosSemLogos(dados) as unknown as Record<string, unknown>,
        criado_por: usuarioId,
        email_status: envio.status,
        resend_id: envio.resendId,
      })
      .select("id")
      .single();
    if (error || !data) console.error("[simulacao] não foi possível registrar o histórico:", error);
    else simulacaoId = data.id;
  }

  return {
    acao: "enviar",
    emailStatus: envio.status,
    erroEmail: envio.erro,
    registrado: simulacaoId !== undefined,
    ...(simulacaoId ? { simulacaoId } : {}),
  };
}
