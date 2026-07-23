import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/queries/posts";
import { formatarData } from "@/lib/blog/blog";
import { PostCard, PostCardDestaque } from "@/components/blog/post-card";

export const revalidate = 3600;

export const metadata: Metadata = {
  title:
    "Blog — Crédito Imobiliário e Mercado | Rafael Teixeira · Capital Imobiliário",
  description:
    "Artigos sobre financiamento imobiliário, home equity, consórcio e o mercado de imóveis de Vinhedo e região. Conteúdo prático de crédito para decisões de alto valor.",
};

export default async function BlogIndicePage() {
  const posts = await getPublishedPosts();
  const destaque = posts.find((post) => post.destaque) ?? posts[0] ?? null;
  const grade = posts.filter((post) => post.id !== destaque?.id);

  return (
    <>
      <header className="blog-hero" id="topo">
        <div className="wrap">
          <div className="eyebrow">Artigos com conhecimento aplicado</div>
          <h1>Imóveis, crédito e mercado sem cortes</h1>
        </div>
      </header>

      <section>
        <div className="wrap">
          {destaque ? (
            <PostCardDestaque
              slug={destaque.slug}
              imagem={destaque.cover_image}
              titulo={destaque.title}
              resumo={destaque.excerpt}
              data={formatarData(destaque.published_at)}
              rotulo={destaque.rotulo}
              categoriaNome={destaque.categoria?.name ?? null}
              categoriaSlug={destaque.categoria?.slug ?? null}
            />
          ) : null}

          {grade.length > 0 ? (
            <div className="post-grade">
              {grade.map((post) => (
                <PostCard
                  key={post.id}
                  slug={post.slug}
                  imagem={post.cover_image}
                  titulo={post.title}
                  resumo={post.excerpt}
                  data={formatarData(post.published_at)}
                  rotulo={post.rotulo}
                  categoriaNome={post.categoria?.name ?? null}
                  categoriaSlug={post.categoria?.slug ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="blog-vazio">Nenhuma matéria publicada ainda.</div>
          )}
        </div>
      </section>
    </>
  );
}
