import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { SITE_URL, CIDADES_ATENDIDAS } from "@/lib/site";
import { NEGOCIO_NODE, RAFAEL_NODE, WEBSITE_NODE } from "@/lib/seo/negocio";
import { montarProfilePage } from "@/lib/seo/perfil";
import { montarFaqPage, type FaqItem } from "@/lib/seo/faq";
import { montarItemList } from "@/lib/seo/lista";
import { montarBreadcrumb } from "@/lib/seo/breadcrumb";
import { areaServida } from "@/lib/seo/area";
import { imagensDoImovel, imagensDoPost } from "@/lib/seo/sitemap-imagens";
import { FAQ_FINANCIAMENTO, FAQ_HOME_EQUITY } from "@/lib/seo/faqs-landings";

describe("WEBSITE_NODE", () => {
  it("declara o site com publisher apontando para #negocio e sem SearchAction", () => {
    expect(WEBSITE_NODE["@type"]).toBe("WebSite");
    expect(WEBSITE_NODE["@id"]).toBe(`${SITE_URL}/#website`);
    expect(WEBSITE_NODE.url).toBe(`${SITE_URL}/`);
    expect(WEBSITE_NODE.inLanguage).toBe("pt-BR");
    expect(WEBSITE_NODE.publisher).toEqual({ "@id": `${SITE_URL}/#negocio` });
    expect(JSON.stringify(WEBSITE_NODE)).not.toContain("SearchAction");
  });
});

describe("montarFaqPage", () => {
  const itens: FaqItem[] = [
    { pergunta: "A?", resposta: "Resposta A." },
    { pergunta: "B?", resposta: "Resposta B." },
  ];
  it("monta Question/Answer na mesma ordem", () => {
    const faq = montarFaqPage(itens);
    expect(faq).toEqual({
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "A?", acceptedAnswer: { "@type": "Answer", text: "Resposta A." } },
        { "@type": "Question", name: "B?", acceptedAnswer: { "@type": "Answer", text: "Resposta B." } },
      ],
    });
  });
  it("devolve null sem itens", () => {
    expect(montarFaqPage([])).toBeNull();
  });
  it("as landings têm FAQ preenchido", () => {
    expect(FAQ_FINANCIAMENTO).toHaveLength(9);
    expect(FAQ_HOME_EQUITY).toHaveLength(9);
    for (const f of [...FAQ_FINANCIAMENTO, ...FAQ_HOME_EQUITY]) {
      expect(f.pergunta.trim()).not.toBe("");
      expect(f.resposta).not.toMatch(/\s{2,}|\n/);
    }
  });
});

describe("areaServida", () => {
  it("deriva de CIDADES_ATENDIDAS", () => {
    expect(areaServida()).toEqual(CIDADES_ATENDIDAS.map((name) => ({ "@type": "City", name })));
  });
});

describe("montarItemList", () => {
  it("numera a partir de 1, URL absoluta com barra final, na ordem recebida", () => {
    const lista = montarItemList([
      { caminho: "/imoveis/a/" },
      { caminho: "/imoveis/b" },
      { caminho: `${SITE_URL}/imoveis/c/` },
    ]);
    expect(lista["@type"]).toBe("ItemList");
    expect(lista.itemListElement.map((i) => [i.position, i.url])).toEqual([
      [1, `${SITE_URL}/imoveis/a/`],
      [2, `${SITE_URL}/imoveis/b/`],
      [3, `${SITE_URL}/imoveis/c/`],
    ]);
  });
  it("lista vazia gera itemListElement vazio", () => {
    expect(montarItemList([]).itemListElement).toEqual([]);
  });
});

describe("montarBreadcrumb", () => {
  it("Início sempre primeiro, último item sem URL", () => {
    const b = montarBreadcrumb([{ nome: "Sobre" }]);
    expect(b["@type"]).toBe("BreadcrumbList");
    expect(b.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Sobre" },
    ]);
  });
  it("trilha intermediária com URL absoluta", () => {
    const b = montarBreadcrumb([{ nome: "Blog", caminho: "/blog/" }, { nome: "X" }]);
    expect(b.itemListElement[1]).toEqual({
      "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog/`,
    });
    expect(b.itemListElement[2]).toEqual({ "@type": "ListItem", position: 3, name: "X" });
  });
});

describe("imagens do sitemap", () => {
  it("post: só a capa, absoluta", () => {
    expect(imagensDoPost({ cover_image: "https://x.supabase.co/a.jpg" })).toEqual(["https://x.supabase.co/a.jpg"]);
    expect(imagensDoPost({ cover_image: "/images/c.jpg" })).toEqual([`${SITE_URL}/images/c.jpg`]);
    expect(imagensDoPost({ cover_image: null })).toEqual([]);
  });
  it("imóvel: capa + galerias, sem duplicar nem vazias", () => {
    const urls = imagensDoImovel({
      cover_image: "/c.jpg",
      imagens: [{ url: "/c.jpg" }, { url: "https://x/y.webp" }, { url: "" }],
    });
    expect(urls).toEqual([`${SITE_URL}/c.jpg`, "https://x/y.webp"]);
  });
});

const MAPS_CID = "https://www.google.com/maps?cid=1997059006678757798";
const emPublic = (url: string) => path.join(process.cwd(), "public", url.replace(SITE_URL, ""));

describe("NEGOCIO_NODE", () => {
  it("logo é o PNG quadrado de marca, com lado >= 112 px", async () => {
    expect(NEGOCIO_NODE.logo.endsWith("/images/logo-rt.png")).toBe(true);
    const arquivo = emPublic(NEGOCIO_NODE.logo);
    expect(existsSync(arquivo)).toBe(true);
    const meta = await sharp(arquivo).metadata();
    expect(meta.width).toBe(meta.height);
    expect(meta.width ?? 0).toBeGreaterThanOrEqual(112);
  });
  it("sameAs e hasMap usam a URL do Maps por cid, sem share.google", () => {
    expect(NEGOCIO_NODE.sameAs).toContain(MAPS_CID);
    expect(NEGOCIO_NODE.hasMap).toBe(MAPS_CID);
    expect(JSON.stringify([NEGOCIO_NODE, RAFAEL_NODE, WEBSITE_NODE])).not.toContain("share.google");
  });
});

describe("RAFAEL_NODE", () => {
  it("url aponta para /sobre/ e a imagem existe em public/", () => {
    expect(RAFAEL_NODE.url).toBe(`${SITE_URL}/sobre/`);
    expect(existsSync(emPublic(RAFAEL_NODE.image))).toBe(true);
  });
  it("sameAs só com https e knowsAbout preenchido", () => {
    expect(RAFAEL_NODE.sameAs.length).toBeGreaterThan(0);
    for (const u of RAFAEL_NODE.sameAs) expect(u.startsWith("https://")).toBe(true);
    expect(RAFAEL_NODE.knowsAbout.length).toBeGreaterThan(0);
  });
  it("credencial do CRECI-SP leva o número do registro", () => {
    const creci = RAFAEL_NODE.hasCredential.find((c) => c.recognizedBy.name === "CRECI-SP");
    expect(creci).toBeDefined();
    expect((creci as { identifier?: string }).identifier).toBe("283020-F");
  });
});

describe("montarProfilePage", () => {
  it("referencia #rafael por @id e não redeclara o Person", () => {
    const p = montarProfilePage();
    expect(p["@type"]).toBe("ProfilePage");
    expect(p.url).toBe(`${SITE_URL}/sobre/`);
    expect(p.mainEntity).toEqual({ "@id": `${SITE_URL}/#rafael` });
    expect(JSON.stringify(p)).not.toContain("Person");
  });
});
