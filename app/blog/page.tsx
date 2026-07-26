import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/queries/posts";
import { BlogFiltro } from "@/components/blog/BlogFiltro";

export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    "Blog — Crédito Imobiliário e Mercado | Rafael Teixeira · Capital Imobiliário",
  description:
    "Artigos sobre financiamento imobiliário, home equity, consórcio e o mercado de imóveis de Vinhedo e região. Conteúdo prático de crédito para decisões de alto valor.",
  alternates: {
    canonical: "/blog/",
  },
};

export default async function BlogIndicePage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <header className="blog-hero" id="topo">
        <div className="wrap">
          <div className="eyebrow reveal">Artigos com conhecimento aplicado</div>
          <h1 className="reveal d1">Imóveis, crédito e mercado sem cortes</h1>
        </div>
      </header>

      <section>
        <div className="wrap">
          <BlogFiltro posts={posts} />
        </div>
      </section>
    </>
  );
}
