import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/queries/posts";
import { BlogFiltro } from "@/components/blog/BlogFiltro";
import { IMAGEM_OG_PADRAO, OG_IMAGEM_PADRAO, SITE_NOME } from "@/lib/og";

export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    "Blog — Crédito Imobiliário e Mercado | Rafael Teixeira · Capital Imobiliário",
  description:
    "Artigos sobre financiamento imobiliário, home equity, consórcio e o mercado de imóveis de Vinhedo e região. Conteúdo prático de crédito para decisões de alto valor.",
  alternates: {
    canonical: "/blog/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NOME,
    title: "Blog — crédito imobiliário e mercado de Vinhedo e região",
    description:
      "Artigos sobre financiamento imobiliário, home equity, consórcio e o mercado de imóveis da região. Conteúdo prático para decisões de alto valor.",
    url: "/blog/",
    images: [IMAGEM_OG_PADRAO],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — crédito imobiliário e mercado de Vinhedo e região",
    description:
      "Financiamento, home equity, consórcio e mercado de imóveis: conteúdo prático de crédito.",
    images: [OG_IMAGEM_PADRAO],
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
