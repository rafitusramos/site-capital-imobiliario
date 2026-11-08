import type { ConsoleMessage, Page } from "@playwright/test";

/** Todos os JSON-LD da página, já com `@graph` achatado. */
export async function lerJsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const textos = await page.locator('script[type="application/ld+json"]').allTextContents();
  const nos: Record<string, unknown>[] = [];
  for (const texto of textos) {
    const bruto = JSON.parse(texto) as unknown;
    const lista = Array.isArray(bruto) ? bruto : [bruto];
    for (const item of lista as Record<string, unknown>[]) {
      const grafo = item["@graph"];
      if (Array.isArray(grafo)) nos.push(...(grafo as Record<string, unknown>[]));
      else nos.push(item);
    }
  }
  return nos;
}

export function tiposJsonLd(nos: Record<string, unknown>[]): string[] {
  return nos.flatMap((n) => {
    const t = n["@type"];
    return Array.isArray(t) ? (t as string[]) : t ? [String(t)] : [];
  });
}

export type ErrosColetados = { proprios: string[]; terceiros: string[] };

/**
 * Coleta `pageerror` e `console.error`. Erro cuja origem é de outro domínio
 * (GA, Meta, fontes bloqueadas) vai para `terceiros`: é relatado, não reprova.
 */
export function coletarErros(page: Page, origemSite: string): ErrosColetados {
  const erros: ErrosColetados = { proprios: [], terceiros: [] };
  const host = new URL(origemSite).host;
  page.on("pageerror", (e) => erros.proprios.push(`pageerror: ${e.message}`));
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const url = msg.location().url;
    const texto = `console.error: ${msg.text()}${url ? ` (${url})` : ""}`;
    let externo = false;
    try {
      externo = url !== "" && new URL(url).host !== host;
    } catch {
      externo = false;
    }
    (externo ? erros.terceiros : erros.proprios).push(texto);
  });
  return erros;
}

export async function metaContent(page: Page, seletor: string): Promise<string> {
  return (await page.locator(seletor).first().getAttribute("content")) ?? "";
}

export async function canonicalDaPagina(page: Page): Promise<string> {
  return (await page.locator('link[rel="canonical"]').first().getAttribute("href")) ?? "";
}
