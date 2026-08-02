import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getPostBySlug,
  getPublishedPosts,
  getRelatedPosts,
} from "@/lib/queries/posts";
import { ctaDoArtigo, dividirConteudo, formatarData } from "@/lib/blog/blog";
import { PostCard } from "@/components/blog/post-card";
import { SITE_URL } from "@/lib/site";
import { imagemOg, SITE_NOME } from "@/lib/og";

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

  const titulo = post.seo_title ?? post.title;
  const descricao = post.seo_description ?? post.excerpt ?? undefined;
  const imagem = imagemOg(post.cover_image, post.title);

  return {
    title: titulo,
    description: descricao,
    alternates: post.canonical_url ? { canonical: post.canonical_url } : undefined,
    openGraph: {
      type: "article",
      siteName: SITE_NOME,
      title: titulo,
      description: descricao,
      url: `/blog/${post.slug}/`,
      images: [imagem],
      locale: "pt_BR",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: ["Rafael Teixeira"],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: [imagem.url],
    },
  };
}

export default async function PaginaArtigo({ params }: PaginaArtigoProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const categoriaNome = post.categoria?.name ?? null;
  const cta = ctaDoArtigo(categoriaNome);
  const { primeiroParagrafo, restante } = dividirConteudo(post.content);

  const relacionados = post.category_id
    ? await getRelatedPosts(post.id, post.category_id, 3)
    : [];

  // URL canônica do post (com barra final — o projeto usa trailingSlash: true).
  const urlPost = `${SITE_URL}/blog/${post.slug}/`;

  // author/publisher referenciam os nós declarados uma única vez no layout
  // (ver lib/seo/negocio.ts), em vez de duplicar o Person inline — o que
  // antes criava uma segunda descrição de "#rafael" divergente da do layout.
  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.seo_description ?? post.excerpt ?? undefined,
        datePublished: post.published_at ?? undefined,
        dateModified: post.updated_at,
        image: post.cover_image ? `${SITE_URL}${post.cover_image}` : undefined,
        url: urlPost,
        mainEntityOfPage: urlPost,
        author: { "@id": `${SITE_URL}/#rafael` },
        publisher: { "@id": `${SITE_URL}/#negocio` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Início",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${SITE_URL}/blog/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <div className="artigo-secao">
        <article className="artigo-corpo" id="topo">
          <div className="artigo-meta">
            {categoriaNome}
            <span className="sep">·</span>
            {formatarData(post.published_at)}
          </div>
          <h1>{post.title}</h1>

          {/* Ordem: H1, primeiro parágrafo, capa e só então o restante. */}
          <div className="artigo-texto">
            {primeiroParagrafo ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {primeiroParagrafo}
              </ReactMarkdown>
            ) : null}

            {post.cover_image ? (
              <figure className="artigo-imagem">
                <img src={post.cover_image} alt={post.title} loading="lazy" />
              </figure>
            ) : null}

            {restante ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {restante}
              </ReactMarkdown>
            ) : null}
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
      </div>

      {relacionados.length > 0 ? (
        <section id="relacionados" className="wrap relacionados">
          <div className="eyebrow">Continue lendo</div>
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
