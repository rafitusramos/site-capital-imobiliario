import { motorPadrao } from "@/lib/instagram/motor-padrao";
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
    if (!motor) return redirecionar(SITE_URL);
    const destino = await motor.registrarClique(codigo, req.headers.get("user-agent"));
    return redirecionar(destino ?? SITE_URL);
  } catch (ex) {
    console.error("[instagram] link curto falhou", ex);
    return redirecionar(SITE_URL);
  }
}
