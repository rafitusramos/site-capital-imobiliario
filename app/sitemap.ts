import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/queries/posts";
import { getImoveisPublicados } from "@/lib/queries/imoveis";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, imoveis] = await Promise.all([getPublishedPosts(), getImoveisPublicados()]);

  const paginasFixas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/financiamento/` },
    { url: `${SITE_URL}/home_equity/` },
    { url: `${SITE_URL}/sobre/` },
    { url: `${SITE_URL}/blog/` },
    { url: `${SITE_URL}/imoveis/` },
    { url: `${SITE_URL}/politica-de-privacidade/` },
    { url: `${SITE_URL}/termos-de-uso/` },
  ];

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
