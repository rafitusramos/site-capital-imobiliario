// Link curto /ir/<codigo>/ e UTMs do destino (puro).
import { SITE_URL } from "@/lib/site";

const ALFABETO = "abcdefghijklmnopqrstuvwxyz0123456789";
const HOST_DO_SITE = "rtcapitalimobiliario.com.br";

/** 10 caracteres [a-z0-9] (rejeição por viés: descarta bytes >= 252, múltiplo de 36). */
export function gerarCodigo(): string {
  let saida = "";
  while (saida.length < 10) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const b of bytes) {
      if (b < 252 && saida.length < 10) saida += ALFABETO[b % 36];
    }
  }
  return saida;
}

export function urlCurta(codigo: string): string {
  return `${SITE_URL}/ir/${codigo}/`;
}

/** Acrescenta UTMs só para o nosso host; não apaga query/hash nem sobrescreve UTM presente. */
export function destinoComUtm(url: string, slug: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.hostname !== HOST_DO_SITE) return url;
  const padrao: Array<[string, string]> = [
    ["utm_source", "instagram"],
    ["utm_medium", "dm"],
    ["utm_campaign", slug],
  ];
  for (const [k, v] of padrao) {
    if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  }
  return u.toString();
}

const ROBOS = ["facebookexternalhit", "facebot", "meta-externalagent", "meta-externalfetcher"];

/** Robôs de prévia de link da Meta: não contam como clique de pessoa. */
export function ehRoboDePrevia(ua: string | null): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();
  return ROBOS.some((r) => s.includes(r));
}
