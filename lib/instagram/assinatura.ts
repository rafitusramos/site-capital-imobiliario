import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Confere o cabeçalho `X-Hub-Signature-256` (`sha256=<hex>`) do webhook da Meta:
 * HMAC-SHA256 do corpo BRUTO com o segredo do app. Nunca lança.
 */
export function assinaturaValida(
  corpoBruto: string,
  cabecalho: string | null,
  segredo: string,
): boolean {
  if (!segredo || !cabecalho || !cabecalho.startsWith("sha256=")) return false;
  const recebido = Buffer.from(cabecalho.slice("sha256=".length), "utf8");
  const esperado = Buffer.from(
    createHmac("sha256", segredo).update(corpoBruto, "utf8").digest("hex"),
    "utf8",
  );
  // timingSafeEqual lança com tamanhos diferentes.
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(recebido, esperado);
}
