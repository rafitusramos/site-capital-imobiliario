import { describe, expect, test } from "vitest";
import { montarLlmsTxt, type DadosLlms } from "@/lib/seo/llms";
import { SITE_URL } from "@/lib/site";

const base: DadosLlms = { artigos: [], imoveis: [] };
const comDados: DadosLlms = {
  artigos: [
    { titulo: "Home equity: o que é", slug: "home-equity-o-que-e", resumo: "Linha um\n  linha dois" },
    { titulo: "Sem resumo", slug: "sem-resumo", resumo: null },
  ],
  imoveis: [
    { titulo: "Gran VIC\nNiágara", slug: "gran-vic", tipo: "Apartamento", cidade: "Vinhedo" },
    { titulo: "Casa Sem Dados", slug: "casa", tipo: null, cidade: null },
  ],
};

describe("montarLlmsTxt", () => {
  test("título, blockquote e seções fixas", () => {
    const t = montarLlmsTxt(base);
    expect(t.startsWith("# Rafael Teixeira · Capital Imobiliário\n")).toBe(true);
    expect(t).toMatch(/\n> .+/);
    expect(t).toContain("CRECI-SP 283020-F");
    expect(t).toContain("Vinhedo");
    expect(t).toContain("## Serviços");
    expect(t).toContain(`](${SITE_URL}/financiamento/)`);
    expect(t).toContain(`](${SITE_URL}/home_equity/)`);
    expect(t).toContain(`](${SITE_URL}/sobre/)`);
    expect(t).toContain("## Opcional");
  });

  test("sem dados, não há seção de artigos nem de imóveis", () => {
    const t = montarLlmsTxt(base);
    expect(t).not.toContain("## Artigos");
    expect(t).not.toContain("## Imóveis");
  });

  test("com dados, artigos e imóveis saem com URL absoluta e barra final", () => {
    const t = montarLlmsTxt(comDados);
    expect(t).toContain("## Artigos");
    expect(t).toContain(`- [Home equity: o que é](${SITE_URL}/blog/home-equity-o-que-e/): Linha um linha dois`);
    expect(t).toContain(`- [Sem resumo](${SITE_URL}/blog/sem-resumo/)\n`);
    expect(t).toContain("## Imóveis");
    expect(t).toContain(`- [Gran VIC Niágara](${SITE_URL}/imoveis/gran-vic/): Apartamento em Vinhedo`);
    expect(t).toContain(`- [Casa Sem Dados](${SITE_URL}/imoveis/casa/)\n`);
  });

  test("todo link é absoluto, termina em barra e nenhum é de /admin", () => {
    const t = montarLlmsTxt(comDados);
    const urls = [...t.matchAll(/\]\((https?:[^)]*)\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(6);
    for (const u of urls) {
      expect(u.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(u.endsWith("/")).toBe(true);
    }
    expect(t).not.toContain("/admin");
  });

  test("nenhum item de lista quebra linha", () => {
    const linhas = montarLlmsTxt(comDados).split("\n");
    const i = linhas.findIndex((l) => l.startsWith("- [Gran VIC"));
    expect(i).toBeGreaterThan(-1);
    for (const l of linhas.filter((l) => l.startsWith("- ["))) {
      expect(l).toMatch(/\]\(https:[^)]+\)/);
    }
  });
});
