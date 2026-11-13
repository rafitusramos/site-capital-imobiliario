import { after } from "next/server";
import { assinaturaValida } from "@/lib/instagram/assinatura";
import { configMeta } from "@/lib/instagram/config";
import { lerEventos } from "@/lib/instagram/eventos";
import { chaveDoEvento } from "@/lib/instagram/motor";
import { motorPadrao, repositorioPadrao } from "@/lib/instagram/motor-padrao";

// Webhook da Meta (comentários e mensagens do Instagram). Spec §7.1.
// Responde rápido: grava os eventos, devolve 200 e processa em after().

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };
const LIMITE_CORPO_BYTES = 1024 * 1024;

function resposta(corpo: string, status: number): Response {
  return new Response(corpo, { status, headers: { ...SEM_CACHE, "Content-Type": "text/plain; charset=utf-8" } });
}

/** Verificação de inscrição: a Meta chama uma vez ao configurar o webhook. */
export async function GET(req: Request): Promise<Response> {
  const cfg = configMeta();
  if (!cfg) return resposta("Não configurado.", 503);
  const q = new URL(req.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === cfg.verifyToken) {
    return resposta(q.get("hub.challenge") ?? "", 200);
  }
  return resposta("Proibido.", 403);
}

export async function POST(req: Request): Promise<Response> {
  const cfg = configMeta();
  if (!cfg) return resposta("Não configurado.", 503);

  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > LIMITE_CORPO_BYTES) return resposta("Corpo grande demais.", 413);
  const corpo = await req.text();
  if (Buffer.byteLength(corpo, "utf8") > LIMITE_CORPO_BYTES) return resposta("Corpo grande demais.", 413);

  if (!assinaturaValida(corpo, req.headers.get("x-hub-signature-256"), cfg.appSecret)) {
    return resposta("Assinatura inválida.", 401);
  }

  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return resposta("ok", 200); // assinado, mas sem JSON: nada a processar, e a Meta não precisa reentregar.
  }
  const eventos = lerEventos(json);
  if (eventos.length === 0) return resposta("ok", 200);

  try {
    const repo = repositorioPadrao();
    if (!(await repo.conta())) return resposta("ok", 200); // sem conta conectada, nada a processar
    const porChave = new Map(eventos.map((e) => [chaveDoEvento(e), e]));
    const novas = await repo.registrarEventos([...porChave].map(([chave, e]) => ({ chave, payload: e })));
    await repo.tocarUltimoEvento();

    const novos = novas.map((c) => porChave.get(c)).filter((e) => e !== undefined);
    if (novos.length > 0) {
      after(async () => {
        try {
          const motor = await motorPadrao();
          if (!motor) return;
          for (const e of novos) await motor.processarEvento(e);
        } catch (ex) {
          console.error("[instagram] webhook: falha ao processar eventos", ex);
        }
      });
    }
  } catch (ex) {
    // 500 faz a Meta reentregar: o evento ainda não foi gravado.
    console.error("[instagram] webhook: falha ao gravar eventos", ex);
    return resposta("Erro ao gravar.", 500);
  }
  return resposta("ok", 200);
}
