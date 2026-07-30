import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/queries/posts";
import { getImoveisPublicados } from "@/lib/queries/imoveis";
import { SITE_URL } from "@/lib/site";

// lastModified das páginas fixas: mantido À MÃO, não gerado. Cada data é a
// do último commit que alterou o CONTEÚDO visível daquela página — nunca
// `new Date()` nem a data de build. Se o sitemap preenchesse lastmod com a
// data do deploy, toda página pareceria modificada a cada build, e o
// Google trata isso como sinal sem valor (o oposto do que lastmod deveria
// comunicar). Quando o conteúdo visível de uma página mudar de verdade,
// atualize a data correspondente abaixo. A refatoração de JSON-LD feita
// junto com a criação deste mapa NÃO é mudança de conteúdo — dados
// estruturados não são conteúdo visível — por isso as datas abaixo não
// foram alteradas por causa dela.
const LAST_MODIFIED_FIXAS: Record<string, string> = {
  "/": "2026-07-28",
  "/financiamento/": "2026-07-29",
  "/home_equity/": "2026-07-29",
  "/sobre/": "2026-07-28",
  "/blog/": "2026-07-28",
  "/imoveis/": "2026-07-28",
  "/politica-de-privacidade/": "2026-07-29",
  "/termos-de-uso/": "2026-07-29",
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, imoveis] = await Promise.all([getPublishedPosts(), getImoveisPublicados()]);

  const paginasFixas: MetadataRoute.Sitemap = Object.entries(LAST_MODIFIED_FIXAS).map(
    ([caminho, data]) => ({
      url: `${SITE_URL}${caminho}`,
      lastModified: data,
    }),
  );

  const paginasPosts: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}/`,
    lastModified: post.updated_at,
  }));

  const paginasImoveis: MetadataRoute.Sitemap = imoveis.map((imovel) => ({
    url: `${SITE_URL}/imoveis/${imovel.slug}/`,
    lastModified: imovel.updated_at,
  }));

  return [...paginasFixas, ...paginasPosts, ...paginasImoveis];
}
