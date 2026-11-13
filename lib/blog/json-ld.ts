import { SITE_URL } from "@/lib/site";
import { urlAbsoluta } from "@/lib/og";
import { dataDeModificacao } from "@/lib/blog/revisao";

/** Campos do post que entram no JSON-LD do artigo. */
export type PostParaJsonLd = {
  title: string;
  slug: string;
  seo_description: string | null;
  excerpt: string | null;
  published_at: string | null;
  updated_at: string;
  /** Opcional: a coluna só existe depois da migration 034. */
  revisado_em?: string | null;
  cover_image: string | null;
};

/**
 * Monta o JSON-LD do artigo (BlogPosting + BreadcrumbList).
 *
 * `image` passa por `urlAbsoluta`: a capa vem do Supabase Storage já como URL
 * absoluta, e concatenar SITE_URL na frente gerava um valor inválido.
 */
export function montarJsonLdArtigo(post: PostParaJsonLd) {
  // URL canônica do post (com barra final — o projeto usa trailingSlash: true).
  const urlPost = `${SITE_URL}/blog/${post.slug}/`;

  // author/publisher referenciam os nós declarados uma única vez no layout
  // (ver lib/seo/negocio.ts), em vez de duplicar o Person inline — o que
  // antes criava uma segunda descrição de "#rafael" divergente da do layout.
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.seo_description ?? post.excerpt ?? undefined,
        datePublished: post.published_at ?? undefined,
        // Revisão real, não updated_at (ver lib/blog/revisao.ts).
        dateModified: dataDeModificacao(post),
        image: post.cover_image ? urlAbsoluta(post.cover_image) : undefined,
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
}
