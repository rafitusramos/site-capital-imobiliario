import { timingSafeEqual } from "node:crypto";
import { configMeta } from "@/lib/instagram/config";
import { motorPadrao } from "@/lib/instagram/motor-padrao";

// Disparador da fila de envios, chamado a cada minuto pelo pg_cron. Spec §7.5.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };
const LOTE = 20;

function json(corpo: unknown, status: number): Response {
  return Response.json(corpo, { status, headers: SEM_CACHE });
}

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export async function POST(req: Request): Promise<Response> {
  const cfg = configMeta();
  if (!cfg) return json({ erro: "Não configurado." }, 503);
  if (!igual(req.headers.get("authorization") ?? "", `Bearer ${cfg.cronSecret}`)) {
    return json({ erro: "Não autorizado." }, 401);
  }
  try {
    const motor = await motorPadrao();
    if (!motor) return json({ enviados: 0, falhas: 0 }, 200);
    return json(await motor.dispararFila(LOTE), 200);
  } catch (ex) {
    console.error("[instagram] disparar falhou", ex);
    return json({ erro: "Falha ao disparar." }, 500);
  }
}
