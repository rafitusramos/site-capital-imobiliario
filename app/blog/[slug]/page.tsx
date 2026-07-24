import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getPostBySlug,
  getPublishedPosts,
  getRelatedPosts,
} from "@/lib/queries/posts";
import { ctaDoArtigo, formatarData } from "@/lib/blog/blog";
import { PostCard } from "@/components/blog/post-card";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type PaginaArtigoProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PaginaArtigoProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    alternates: post.canonical_url ? { canonical: post.canonical_url } : undefined,
  };
}

export default async function PaginaArtigo({ params }: PaginaArtigoProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const categoriaNome = post.categoria?.name ?? null;
  const cta = ctaDoArtigo(categoriaNome);

  const relacionados = post.category_id
    ? await getRelatedPosts(post.id, post.category_id, 3)
    : [];

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    image: post.cover_image ? `${SITE_URL}${post.cover_image}` : undefined,
    author: {
      "@type": "Person",
      name: "Rafael Teixeira",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <article className="artigo-corpo" id="topo">
        <div className="artigo-meta">
          {categoriaNome}
          <span className="sep">·</span>
          {formatarData(post.published_at)}
        </div>
        <h1>{post.title}</h1>

        {post.cover_image ? (
          <figure className="artigo-imagem">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_image} alt={post.title} loading="lazy" />
          </figure>
        ) : null}

        <div className="artigo-texto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>

        <div className="artigo-cta">
          <h3>{cta.titulo}</h3>
          {post.cta_pagina ? (
            <a className="cta" href={post.cta_pagina}>
              {cta.botao}
            </a>
          ) : null}
        </div>
      </article>

      {relacionados.length > 0 ? (
        <section id="relacionados" className="wrap relacionados">
          <div className="eyebrow">Continue lendo</div>
          <h2>Mais sobre {categoriaNome}</h2>
          <div className="post-grade">
            {relacionados.map((relacionado) => (
              <PostCard
                key={relacionado.id}
                slug={relacionado.slug}
                imagem={relacionado.cover_image}
                titulo={relacionado.title}
                data={formatarData(relacionado.published_at)}
                rotulo={relacionado.rotulo}
                categoriaNome={relacionado.categoria?.name ?? null}
                categoriaSlug={relacionado.categoria?.slug ?? null}
                mostrarResumo={false}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
