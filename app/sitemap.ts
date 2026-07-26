import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/queries/posts";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();

  const paginasFixas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/financiamento/` },
    { url: `${SITE_URL}/home_equity/` },
    { url: `${SITE_URL}/sobre/` },
    { url: `${SITE_URL}/blog/` },
  ];

  const paginasPosts: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}/`,
    lastModified: post.updated_at,
  }));

  return [...paginasFixas, ...paginasPosts];
}
