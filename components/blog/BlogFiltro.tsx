"use client";

import { useMemo, useState } from "react";
import { PostCard, PostCardDestaque } from "@/components/blog/post-card";
import { formatarData } from "@/lib/blog/blog";
import type { PostComCategoria } from "@/lib/queries/posts";

const ORDEM_CATEGORIAS = ["financiamento", "home-equity", "consorcio", "imoveis"];

type BlogFiltroProps = {
  posts: PostComCategoria[];
};

export function BlogFiltro({ posts }: BlogFiltroProps) {
  const [filtro, setFiltro] = useState<string | null>(null);

  const categorias = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const post of posts) {
      if (post.categoria?.slug && !vistas.has(post.categoria.slug)) {
        vistas.set(post.categoria.slug, post.categoria.name);
      }
    }
    return [...vistas.entries()]
      .map(([slug, nome]) => ({ slug, nome }))
      .sort((a, b) => ORDEM_CATEGORIAS.indexOf(a.slug) - ORDEM_CATEGORIAS.indexOf(b.slug));
  }, [posts]);

  const postsFiltrados = useMemo(() => {
    if (!filtro) return posts;
    return posts.filter((post) => post.categoria?.slug === filtro);
  }, [posts, filtro]);

  // O destaque é sempre o mais recente (postsFiltrados já vem ordenado por
  // published_at desc) — não há mais um campo manual para fixar outro post.
  const destaque = postsFiltrados[0] ?? null;

  const grade = postsFiltrados.filter((post) => post.id !== destaque?.id);

  return (
    <>
      {categorias.length > 1 ? (
        <div className="blog-filtro" role="group" aria-label="Filtrar por categoria">
          <button
            type="button"
            className={filtro === null ? "ativo" : undefined}
            onClick={() => setFiltro(null)}
          >
            Todos
          </button>
          {categorias.map((categoria) => (
            <button
              key={categoria.slug}
              type="button"
              className={filtro === categoria.slug ? "ativo" : undefined}
              onClick={() => setFiltro(categoria.slug)}
            >
              {categoria.nome}
            </button>
          ))}
        </div>
      ) : null}

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
      ) : !destaque ? (
        <div className="blog-vazio">Nenhuma matéria publicada ainda.</div>
      ) : null}
    </>
  );
}
