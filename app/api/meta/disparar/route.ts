import { timingSafeEqual } from "node:crypto";
import { configMeta } from "@/lib/instagram/config";
import { motorPadrao } from "@/lib/instagram/motor-padrao";
import { motorWaPadrao } from "@/lib/whatsapp/motor-padrao";

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
  let instagram: unknown;
  let instagramFalhou = false;
  try {
    const motor = await motorPadrao();
    if (!motor) instagram = { enviados: 0, falhas: 0 };
    else {
      await motor.reprocessarPendentes(LOTE);
      instagram = await motor.dispararFila(LOTE);
    }
  } catch (ex) {
    console.error("[instagram] disparar falhou", ex);
    instagram = { erro: "Falha ao disparar." };
    instagramFalhou = true;
  }

  // Um motor falhar não impede o outro.
  let whatsapp: unknown = null;
  let whatsappFalhou = false;
  try {
    const motorWa = motorWaPadrao();
    if (motorWa) {
      await motorWa.reprocessarPendentes(LOTE);
      whatsapp = await motorWa.dispararFila(LOTE);
    }
  } catch (ex) {
    console.error("[whatsapp] disparar falhou", ex);
    whatsapp = { erro: "Falha ao disparar." };
    whatsappFalhou = true;
  }

  return json({ instagram, whatsapp }, instagramFalhou || whatsappFalhou ? 500 : 200);
}
