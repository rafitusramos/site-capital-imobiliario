import { describe, expect, test } from "vitest";
import { montarJsonLdArtigo, type PostParaJsonLd } from "@/lib/blog/json-ld";
import { SITE_URL } from "@/lib/site";

/**
 * Trava o JSON-LD do artigo.
 *
 * A regressão: a capa do post é URL absoluta do Supabase Storage, e a página
 * concatenava SITE_URL na frente, emitindo `image` inválido
 * ("https://rtcapitalimobiliario.com.brhttps://...") em todo artigo com capa.
 */
const CAPA_SUPABASE =
  "https://abc.supabase.co/storage/v1/object/public/post-images/capa.webp";

function postBase(sobrescrever: Partial<PostParaJsonLd> = {}): PostParaJsonLd {
  return {
    title: "Um artigo",
    slug: "um-artigo",
    seo_description: "Descrição de SEO",
    excerpt: "Resumo do artigo",
    published_at: "2026-01-10T12:00:00+00:00",
    updated_at: "2026-02-01T12:00:00+00:00",
    cover_image: CAPA_SUPABASE,
    ...sobrescrever,
  };
}

function blogPosting(post: PostParaJsonLd) {
  return montarJsonLdArtigo(post)["@graph"][0] as Record<string, unknown>;
}

describe("montarJsonLdArtigo", () => {
  test("capa absoluta do Supabase sai inalterada, sem SITE_URL na frente", () => {
    const { image } = blogPosting(postBase()) as { image: string };
    expect(image).toBe(CAPA_SUPABASE);
    expect(image.startsWith("https://")).toBe(true);
    expect(image.split("https://")).toHaveLength(2);
  });

  test("capa relativa ganha SITE_URL", () => {
    const post = postBase({ cover_image: "/images/x.jpg" });
    expect(blogPosting(post).image).toBe(`${SITE_URL}/images/x.jpg`);
  });

  test("sem capa, image fica indefinido", () => {
    expect(blogPosting(postBase({ cover_image: null })).image).toBeUndefined();
  });

  test("url e mainEntityOfPage terminam em /blog/<slug>/", () => {
    const bp = blogPosting(postBase());
    expect(bp.url).toBe(`${SITE_URL}/blog/um-artigo/`);
    expect(bp.mainEntityOfPage).toBe(`${SITE_URL}/blog/um-artigo/`);
  });

  test("author e publisher referenciam os nós do layout", () => {
    const bp = blogPosting(postBase());
    expect(bp.author).toEqual({ "@id": `${SITE_URL}/#rafael` });
    expect(bp.publisher).toEqual({ "@id": `${SITE_URL}/#negocio` });
  });

  test("BreadcrumbList tem 3 itens e o último é o título", () => {
    const lista = montarJsonLdArtigo(postBase())["@graph"][1] as {
      itemListElement: { name: string }[];
    };
    expect(lista.itemListElement).toHaveLength(3);
    expect(lista.itemListElement[2].name).toBe("Um artigo");
  });

  test("description cai de seo_description para excerpt e depois undefined", () => {
    expect(blogPosting(postBase()).description).toBe("Descrição de SEO");
    expect(
      blogPosting(postBase({ seo_description: null })).description,
    ).toBe("Resumo do artigo");
    expect(
      blogPosting(postBase({ seo_description: null, excerpt: null }))
        .description,
    ).toBeUndefined();
  });
});
