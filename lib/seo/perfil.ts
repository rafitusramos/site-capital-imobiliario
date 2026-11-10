import { SITE_URL } from "@/lib/site";

/**
 * ProfilePage de /sobre/. Só referencia o Person por "@id": a entidade
 * "#rafael" é declarada uma única vez, no layout (lib/seo/negocio.ts), e
 * redeclará-la aqui traria de volta as entidades conflitantes.
 */
export function montarProfilePage() {
  return {
    "@type": "ProfilePage" as const,
    url: `${SITE_URL}/sobre/`,
    mainEntity: { "@id": `${SITE_URL}/#rafael` },
  };
}
