import { SITE_URL } from "@/lib/site";
import { urlAbsoluta } from "@/lib/og";

export type MigalhaPasso = { nome: string; caminho?: string };

/**
 * BreadcrumbList com "Início" sempre na frente. O último passo é a página
 * atual e fica sem `item`, como no restante do site.
 */
export function montarBreadcrumb(passos: readonly MigalhaPasso[]) {
  return {
    "@type": "BreadcrumbList" as const,
    itemListElement: [
      { "@type": "ListItem" as const, position: 1, name: "Início", item: `${SITE_URL}/` },
      ...passos.map((passo, i) => ({
        "@type": "ListItem" as const,
        position: i + 2,
        name: passo.nome,
        ...(passo.caminho ? { item: urlAbsoluta(passo.caminho) } : {}),
      })),
    ],
  };
}
