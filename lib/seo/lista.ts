import { urlAbsoluta } from "@/lib/og";

/** Garante a barra final, igual ao `trailingSlash: true` do projeto. */
function comBarraFinal(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/**
 * ItemList de uma listagem, na ordem em que ela é exibida. Cada item aponta
 * para a URL canônica (absoluta, com barra final) da página de detalhe.
 */
export function montarItemList(itens: readonly { caminho: string }[]) {
  return {
    "@type": "ItemList" as const,
    itemListElement: itens.map((item, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      url: comBarraFinal(urlAbsoluta(item.caminho)),
    })),
  };
}

