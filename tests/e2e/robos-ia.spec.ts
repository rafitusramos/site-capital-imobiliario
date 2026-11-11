import { expect, test } from "@playwright/test";
import { ROBOS_IA } from "@/lib/seo/robos-ia";

// Somente leitura: só GET de /robots.txt, /llms.txt e das páginas listadas nele.
const DOMINIO = "https://rtcapitalimobiliario.com.br";
const LIMITE_LINKS_VERIFICADOS = 15;

test.describe("robots.txt com robôs de IA", () => {
  let corpo = "";

  test.beforeAll(async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const r = await ctx.get("/robots.txt");
    expect(r.status()).toBe(200);
    corpo = await r.text();
    await ctx.dispose();
  });

  test("responde 200 text/plain", async ({ request }) => {
    const r = await request.get("/robots.txt");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("text/plain");
  });

  test("lista cada robô de IA", () => {
    expect(ROBOS_IA.length).toBeGreaterThanOrEqual(11);
    for (const robo of ROBOS_IA) {
      expect(corpo, `User-Agent: ${robo}`).toMatch(new RegExp(`^User-Agent: ${robo}$`, "mi"));
    }
  });

  test("todo grupo de User-Agent bloqueia /admin e libera /", () => {
    const grupos = corpo.trim().split(/\r?\n\s*\r?\n/).filter((g) => /^User-Agent:/im.test(g));
    expect(grupos.length).toBeGreaterThanOrEqual(2);
    for (const g of grupos) {
      expect(g, g).toMatch(/^Disallow: \/admin$/m);
      expect(g, g).toMatch(/^Allow: \/$/m);
    }
  });

  test("nenhum Disallow: / sozinho", () => {
    expect(corpo).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });

  test("aponta o sitemap", () => {
    expect(corpo).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m);
  });
});

test.describe("/llms.txt", () => {
  let corpo = "";

  test.beforeAll(async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const r = await ctx.get("/llms.txt", { maxRedirects: 0 });
    corpo = await r.text();
    await ctx.dispose();
  });

  test("200 direto, sem redirect, text/plain utf-8", async ({ request }) => {
    const r = await request.get("/llms.txt", { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    const tipo = r.headers()["content-type"] ?? "";
    expect(tipo).toContain("text/plain");
    expect(tipo.toLowerCase()).toContain("charset=utf-8");
  });

  test("começa com o título e tem blockquote", () => {
    expect(corpo.startsWith("# Rafael Teixeira · Capital Imobiliário")).toBe(true);
    expect(corpo).toMatch(/^> \S/m);
  });

  test("acentos legíveis, sem mojibake", () => {
    expect(corpo).toContain("Imobiliário");
    expect(corpo).not.toMatch(/Ã|�/);
  });

  test("seção Serviços linka financiamento e home equity", () => {
    const secao = corpo.split(/^## /m).find((s) => s.startsWith("Serviços")) ?? "";
    expect(secao, "seção ## Serviços").not.toBe("");
    expect(secao).toContain(`](${DOMINIO}/financiamento/)`);
    expect(secao).toContain(`](${DOMINIO}/home_equity/)`);
  });

  test("seção Artigos tem ao menos um link /blog/<slug>/", () => {
    const secao = corpo.split(/^## /m).find((s) => s.startsWith("Artigos")) ?? "";
    expect(secao, "seção ## Artigos").not.toBe("");
    expect(secao).toMatch(new RegExp(`\\]\\(${DOMINIO}/blog/[^/)]+/\\)`));
  });

  test("todo link é absoluto no domínio de produção, com barra final e fora de /admin", () => {
    const urls = [...corpo.matchAll(/\]\((\S+?)\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(3);
    for (const u of urls) {
      expect(u, u).toMatch(new RegExp(`^${DOMINIO.replace(/\./g, "\\.")}/.*/$`));
      expect(u, u).not.toContain("/admin");
    }
  });

  // Cada seção tem seu próprio limite: com um limite só, os artigos (que vêm
  // antes) consumiam todos os links e nenhum imóvel era verificado.
  for (const secao of ["blog", "imoveis"] as const) {
    test(`links de /${secao}/ respondem 200 no deploy (até ${LIMITE_LINKS_VERIFICADOS})`, async ({ request }) => {
      const urls = [...corpo.matchAll(/\]\((\S+?)\)/g)]
        .map((m) => m[1])
        .filter((u) => new RegExp(`/${secao}/[^/]+/$`).test(u))
        .slice(0, LIMITE_LINKS_VERIFICADOS);
      expect(urls.length).toBeGreaterThan(0);
      for (const u of urls) {
        const caminho = u.replace(DOMINIO, "");
        const r = await request.get(caminho, { maxRedirects: 0 });
        expect(r.status(), caminho).toBe(200);
      }
    });
  }
});
