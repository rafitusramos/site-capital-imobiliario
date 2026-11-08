import { PostCard } from "@/components/blog/post-card";
import { formatarData, postsDaCategoria } from "@/lib/blog/blog";
import type { PostComCategoria } from "@/lib/queries/posts";

type LeiaTambemProps = {
  posts: PostComCategoria[];
  categoriaSlug: string;
};

/**
 * Linkagem interna das landings para o blog: os 3 posts mais recentes da
 * categoria correspondente. Sem posts, não renderiza nada.
 */
export function LeiaTambem({ posts, categoriaSlug }: LeiaTambemProps) {
  const selecionados = postsDaCategoria(posts, categoriaSlug, 3);
  if (selecionados.length === 0) return null;

  return (
    <section id="leia-tambem">
      <div className="wrap">
        <h2 className="eyebrow reveal">Leia também</h2>
        <div className="post-grade">
          {selecionados.map((post) => (
            <PostCard
              key={post.id}
              slug={post.slug}
              imagem={post.cover_image}
              titulo={post.title}
              data={formatarData(post.published_at)}
              rotulo={post.rotulo}
              categoriaNome={post.categoria?.name ?? null}
              categoriaSlug={post.categoria?.slug ?? null}
              mostrarResumo={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
