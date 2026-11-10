import { dependenciasEmailDoAmbiente } from "@/lib/email/notificar";
import { usuarioAutenticado, ERRO_SESSAO_EXPIRADA } from "@/lib/admin/auth";
import { gerarPdfSimulacao } from "@/lib/simulacao/pdf";
import { corpoSimulacaoSchema, LIMITE_CORPO_BYTES } from "@/lib/simulacao/schema";
import { ErroSimulacao, enviarSimulacaoAnexada, executarSimulacao, obterPdfAnexado, type DepsSimulacao } from "@/lib/simulacao/servico";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Simulação de financiamento do CRM (docs/crm-spec.md §3.7).
 *
 * POST { acao, leadId, ... }:
 * - previa  { dados }: devolve o PDF (application/pdf) sem gravar nem enviar nada;
 * - anexar  { dados }: grava o PDF no bucket privado e a linha em crm_simulacoes
 *           (`anexado`). NENHUM e-mail sai aqui, em nenhuma etapa;
 * - obter   { simulacaoId }: devolve o PDF já gravado (prévia no diálogo de mover);
 * - enviar  { simulacaoId }: envia ao lead o PDF JÁ gravado (lido do bucket, nunca
 *           regerado). Só o movimento Criado -> Simulação chama isto.
 *
 * Quem pode: qualquer usuário do CRM que ENXERGUE o lead. O lead é lido com o
 * cliente de cookies, então a RLS (`leads_visiveis`) decide: quem não vê recebe
 * 404. Não usa `exigirAdmin` de propósito: corretores também operam o CRM.
 * Nome e e-mail do cliente vêm SEMPRE do banco, e a simulação precisa pertencer
 * ao lead informado.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEM_CACHE = { "Cache-Control": "no-store" };
const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status, headers: SEM_CACHE });

const pdfResposta = (pdf: Uint8Array, nomeArquivo: string) =>
  new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nomeArquivo}"`, ...SEM_CACHE },
  });

export async function POST(req: Request) {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return erro(ERRO_SESSAO_EXPIRADA, 401);

  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > LIMITE_CORPO_BYTES) return erro("Dados grandes demais.", 413);
  const texto = await req.text();
  if (texto.length > LIMITE_CORPO_BYTES) return erro("Dados grandes demais.", 413);

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return erro("Corpo inválido.", 400);
  }
  const corpo = corpoSimulacaoSchema.safeParse(json);
  if (!corpo.success) return erro("Dados da simulação inválidos.", 400);

  const { data: lead, error: erroLead } = await supabase
    .from("leads")
    .select("id, tipo, nome, email, telefone, protocolo")
    .eq("id", corpo.data.leadId)
    .maybeSingle();
  if (erroLead) {
    console.error("[simulacao] não foi possível ler o lead:", erroLead);
    return erro("Não foi possível localizar o lead.", 500);
  }
  if (!lead) return erro("Lead não encontrado.", 404);
  if (lead.tipo !== "financiamento") return erro("A simulação só vale para leads de financiamento.", 400);

  const deps: DepsSimulacao = {
    gerarPdf: gerarPdfSimulacao,
    admin: createAdminClient,
    email: dependenciasEmailDoAmbiente,
    agora: () => new Date(),
  };

  try {
    const c = corpo.data;
    if (c.acao === "previa" || c.acao === "anexar") {
      const resultado = await executarSimulacao(deps, c.acao, lead, c.dados, user.id);
      if (resultado.acao === "previa") return pdfResposta(resultado.pdf, resultado.nomeArquivo);
      return Response.json({ ok: true, simulacaoId: resultado.simulacaoId }, { headers: SEM_CACHE });
    }

    if (c.acao === "obter") {
      const { pdf, nomeArquivo } = await obterPdfAnexado(deps, lead, c.simulacaoId);
      return pdfResposta(pdf, nomeArquivo);
    }

    const envio = await enviarSimulacaoAnexada(deps, lead, c.simulacaoId);
    if (envio.emailStatus === "enviado") {
      return Response.json({ ok: true, simulacaoId: envio.simulacaoId }, { headers: SEM_CACHE });
    }
    return Response.json(
      {
        ok: false,
        erro:
          envio.emailStatus === "sem-chave"
            ? "O envio de e-mail não está configurado neste ambiente."
            : "O e-mail não foi enviado. Tente novamente.",
      },
      { status: 502, headers: SEM_CACHE },
    );
  } catch (e) {
    if (e instanceof ErroSimulacao) return erro(e.message, e.status);
    console.error("[simulacao] falha ao processar:", e);
    return erro("Não foi possível processar a simulação.", 500);
  }
}
