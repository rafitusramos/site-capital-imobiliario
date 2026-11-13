import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { exigirAdmin } from "@/lib/admin/auth";
import { assinarWebhooks, contaAtribuida, trocarCodigo } from "@/lib/instagram/graph";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

// Retorno do login unificado da Meta. Só o admin que iniciou a conexão
// (cookie `ig_oauth_state`, gravado por iniciarConexao) conclui o fluxo.
// O token nunca vai à URL de redirecionamento nem ao log.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_STATE = "ig_oauth_state";
const PAGINA = "/admin/instagram/conexao/";

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: NextRequest): Promise<Response> {
  const para = (caminho: string, apagarCookie: boolean) => {
    const r = NextResponse.redirect(new URL(caminho, req.url), 303);
    if (apagarCookie) r.cookies.delete(COOKIE_STATE);
    return r;
  };
  const erro = (motivo: string) => para(`${PAGINA}?erro=${motivo}`, true);

  const { user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return para("/admin/login/", false);

  const state = req.nextUrl.searchParams.get("state") ?? "";
  const esperado = req.cookies.get(COOKIE_STATE)?.value ?? "";
  if (!state || !esperado || !igual(state, esperado)) return erro("state");

  if (req.nextUrl.searchParams.get("error")) return erro("cancelado");

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return erro("troca");

  const troca = await trocarCodigo(code, `${SITE_URL}/api/meta/instagram/retorno/`);
  if (!troca) {
    console.error("[instagram/retorno] troca do código falhou");
    return erro("troca");
  }

  const conta = await contaAtribuida(troca.token);
  if (!conta) {
    console.error("[instagram/retorno] nenhuma conta Instagram atribuída ao login");
    return erro("conta");
  }

  const webhooksAssinados = await assinarWebhooks(troca.token, conta.igUserId);
  if (!webhooksAssinados) console.error("[instagram/retorno] assinatura dos webhooks falhou");

  try {
    const { data, error } = await createAdminClient()
      .from("ig_conta")
      .upsert({
        id: 1,
        ig_user_id: conta.igUserId,
        username: conta.username || null,
        nome: conta.nome || null,
        foto_url: conta.fotoUrl || null,
        token: troca.token,
        webhooks_assinados: webhooksAssinados,
        conectado_em: new Date().toISOString(),
        conectado_por: user.id,
      })
      .select("id");
    if (error || !data || data.length === 0) {
      console.error("[instagram/retorno] falha ao gravar ig_conta:", error?.message ?? "nenhuma linha");
      return erro("gravar");
    }
  } catch (e) {
    console.error("[instagram/retorno] exceção ao gravar ig_conta:", e instanceof Error ? e.message : "desconhecida");
    return erro("gravar");
  }

  return para(`${PAGINA}?ok=1`, true);
}
