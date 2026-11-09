import { dependenciasEmailDoAmbiente } from "@/lib/email/notificar";
import { usuarioAutenticado, ERRO_SESSAO_EXPIRADA } from "@/lib/admin/auth";
import { gerarPdfSimulacao } from "@/lib/simulacao/pdf";
import { corpoSimulacaoSchema, LIMITE_CORPO_BYTES } from "@/lib/simulacao/schema";
import { executarSimulacao } from "@/lib/simulacao/servico";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Simulação de financiamento do CRM (docs/crm-spec.md §3.7).
 *
 * POST { acao: "previa" | "enviar", leadId, dados }:
 * - previa: devolve o PDF (application/pdf) sem gravar nem enviar nada;
 * - enviar: grava o PDF no bucket privado, envia ao lead e registra o histórico.
 *
 * Quem pode: qualquer usuário do CRM que ENXERGUE o lead. O lead é lido com o
 * cliente de cookies, então a RLS (`leads_visiveis`) decide: quem não vê recebe
 * 404. Não usa `exigirAdmin` de propósito: corretores também operam o CRM.
 * Nome e e-mail do cliente vêm SEMPRE do banco.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEM_CACHE = { "Cache-Control": "no-store" };
const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status, headers: SEM_CACHE });

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

  try {
    const resultado = await executarSimulacao(
      { gerarPdf: gerarPdfSimulacao, admin: createAdminClient, email: dependenciasEmailDoAmbiente, agora: () => new Date() },
      corpo.data.acao,
      lead,
      corpo.data.dados,
      user.id,
    );
    if (resultado.acao === "previa") {
      return new Response(new Uint8Array(resultado.pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${resultado.nomeArquivo}"`, ...SEM_CACHE },
      });
    }
    if (resultado.emailStatus === "enviado") {
      return Response.json(
        { ok: true, registrado: resultado.registrado, simulacaoId: resultado.simulacaoId ?? null },
        { headers: SEM_CACHE },
      );
    }
    return Response.json(
      {
        ok: false,
        erro:
          resultado.emailStatus === "sem-chave"
            ? "O envio de e-mail não está configurado neste ambiente."
            : "O e-mail não foi enviado. Tente novamente.",
        registrado: resultado.registrado,
      },
      { status: 502, headers: SEM_CACHE },
    );
  } catch (e) {
    console.error("[simulacao] falha ao processar:", e);
    return erro("Não foi possível gerar a simulação.", 500);
  }
}
