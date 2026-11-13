import { destinoComUtm } from "@/lib/instagram/link";
import { motorPadrao, repositorioPadrao } from "@/lib/instagram/motor-padrao";
import { SITE_URL } from "@/lib/site";

// Link curto /ir/<codigo>/: registra o clique e redireciona ao destino da
// automação. Nunca 404 nem erro: sem destino, vai para o site. Spec §7.4.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirecionar(destino: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: destino, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ codigo: string }> },
): Promise<Response> {
  try {
    const { codigo } = await ctx.params;
    const motor = await motorPadrao();
    if (!motor) {
      // Sem motor (falta config ou a conta caiu) a pessoa ainda precisa chegar ao destino
      // do link que recebeu: resolve pelo repositório, sem registrar clique.
      const repo = repositorioPadrao();
      const p = await repo.participacaoPorCodigo(codigo);
      const a = p ? await repo.automacao(p.automacaoId) : null;
      return redirecionar(a ? destinoComUtm(a.linkUrl, a.slug) : SITE_URL);
    }
    const destino = await motor.registrarClique(codigo, req.headers.get("user-agent"));
    return redirecionar(destino ?? SITE_URL);
  } catch (ex) {
    console.error("[instagram] link curto falhou", ex);
    return redirecionar(SITE_URL);
  }
}
