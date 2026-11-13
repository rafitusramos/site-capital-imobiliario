import { mkdirSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { abrirAdmin, ESTADO_ADMIN, MOTIVO_SEM_QA, test as testeAdmin } from "./apoio/admin";
import { lerJsonLd } from "./apoio/pagina";

// Somente leitura: só GET de /blog/, dos artigos, /sobre/, /sitemap.xml e abre
// o editor de post sem salvar (a fixture de admin aborta Server Actions).
const PASTA = "tests/functional-tests/.artefatos/pr84";
const DESCRICAO_SOBRE =
  "Rafael Teixeira: corretor de imóveis (CRECI-SP) e correspondente bancário especializado em crédito com garantia de imóvel, financiamento SBPE e consórcio. Certificação FEBRABAN CA-600.";

async function slugsDoBlog(request: APIRequestContext): Promise<string[]> {
  const html = await (await request.get("/blog/")).text();
  const slugs = [...html.matchAll(/href="\/blog\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
  return [...new Set(slugs)];
}

function dia(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Dia de "Revisado em" exibido no artigo (aaaa-mm-dd) ou null quando não há revisão visível. */
async function diaRevisado(page: Page): Promise<string | null> {
  const t = page.locator(".artigo-revisado time");
  if ((await t.count()) === 0) return null;
  return (await t.first().getAttribute("datetime"))?.slice(0, 10) ?? null;
}

/** Dia esperado de modificação: a revisão visível, senão a publicação (lib/blog/revisao.ts). */
async function diaEsperadoDeModificacao(page: Page, no: Record<string, unknown>): Promise<string> {
  return (await diaRevisado(page)) ?? dia(String(no.datePublished));
}

async function jsonLdArtigo(page: Page) {
  const nos = await lerJsonLd(page);
  const no = nos.find((n) => n["@type"] === "BlogPosting");
  expect(no, "BlogPosting no JSON-LD").toBeTruthy();
  return no as Record<string, unknown>;
}

test.describe("autor visível no artigo", () => {
  // Percorre vários artigos; com 6 workers no deploy de preview passava dos 30 s.
  test.describe.configure({ timeout: 60_000 });

  let slug = "";
  let slugs: string[] = [];

  test.beforeAll(async ({ playwright, baseURL }) => {
    mkdirSync(PASTA, { recursive: true });
    const ctx = await playwright.request.newContext({ baseURL });
    slugs = await slugsDoBlog(ctx);
    await ctx.dispose();
    expect(slugs.length, "artigos listados em /blog/").toBeGreaterThan(0);
    slug = slugs[0];
  });

  test("assinatura: Por Rafael Teixeira (rel=author) e data em <time>", async ({ page }, info) => {
    await page.goto(`/blog/${slug}/`);
    const meta = page.locator(".artigo-meta");
    const autor = meta.getByRole("link", { name: "Rafael Teixeira" });
    await expect(autor).toHaveAttribute("href", "/sobre/");
    await expect(autor).toHaveAttribute("rel", "author");
    await expect(meta).toContainText(/^\s*Por\s+Rafael Teixeira/);
    const dt = await meta.locator("time").getAttribute("datetime");
    expect(dt, "dateTime").toBeTruthy();
    expect(Number.isNaN(new Date(dt!).getTime())).toBe(false);
    await meta.screenshot({ path: `${PASTA}/assinatura-${info.project.name}.png` });
  });

  test("caixa de autor: entre texto e CTA, com nome, CRECI, texto, link e foto", async ({ page }, info) => {
    await page.goto(`/blog/${slug}/`);
    const caixa = page.locator('aside.caixa-autor[aria-label="Sobre o autor"]');
    await caixa.scrollIntoViewIfNeeded();
    await expect(caixa).toBeVisible();

    const ordem = await page.evaluate(() => {
      const texto = document.querySelector(".artigo-texto");
      const caixa = document.querySelector(".caixa-autor");
      const cta = document.querySelector(".artigo-cta");
      if (!texto || !caixa || !cta) return null;
      const seguinte = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { textoAntes: seguinte(texto, caixa), ctaDepois: seguinte(caixa, cta) };
    });
    expect(ordem, ".artigo-texto, .caixa-autor e .artigo-cta existem").not.toBeNull();
    expect(ordem!.textoAntes, "caixa depois do texto").toBe(true);
    expect(ordem!.ctaDepois, "caixa antes do CTA").toBe(true);

    await expect(caixa.locator("p.caixa-autor-nome")).toHaveText("Rafael Teixeira");
    await expect(caixa.locator("p.caixa-autor-funcao")).toContainText("CRECI-SP 283020-F");
    const texto = caixa.locator("p.caixa-autor-texto");
    await expect(texto).toContainText(/^\s*Corretor de imóveis/);
    expect(await texto.innerText()).not.toContain("Rafael Teixeira");
    const link = caixa.locator("a.caixa-autor-link");
    await expect(link).toHaveText(/Conheça o Rafael/);
    await expect(link).toHaveAttribute("href", "/sobre/");

    const foto = caixa.locator("img.caixa-autor-foto");
    await expect(foto).toHaveAttribute("alt", "");
    await expect
      .poll(() => foto.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth), { message: "foto carregada" })
      .toBeGreaterThan(0);

    await caixa.screenshot({ path: `${PASTA}/caixa-autor-${info.project.name}.png` });
  });

  // Com dado real (o dono preencheu "Revisado em" em 2026-11-13) a premissa
  // "nenhum artigo revisado" caiu: confere a regra, não a ausência.
  test("'Revisado em', quando aparece, é posterior à publicação e vira o dateModified", async ({ page }) => {
    for (const s of slugs.slice(0, 6)) {
      await page.goto(`/blog/${s}/`);
      const no = await jsonLdArtigo(page);
      const publicado = dia(String(no.datePublished));
      const revisado = await diaRevisado(page);
      if (revisado) expect(revisado > publicado, `${s}: revisão ${revisado} após publicação ${publicado}`).toBe(true);
      expect(dia(String(no.dateModified)), `${s}: dateModified`).toBe(await diaEsperadoDeModificacao(page, no));
    }
  });

  test("meta article:modified_time presente", async ({ page }) => {
    await page.goto(`/blog/${slug}/`);
    const v = await page.locator('meta[property="article:modified_time"]').first().getAttribute("content");
    expect(v, "article:modified_time").toBeTruthy();
    expect(Number.isNaN(new Date(v!).getTime())).toBe(false);
  });

  test("sitemap: lastmod de cada /blog/<slug>/ = revisão visível, senão publicação", async ({ page, request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const blocos = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    const lastmod = new Map<string, string>();
    for (const b of blocos) {
      const loc = /<loc>[^<]*\/blog\/([a-z0-9-]+)\/<\/loc>/.exec(b);
      const lm = /<lastmod>([^<]+)<\/lastmod>/.exec(b);
      if (loc && lm) lastmod.set(loc[1], lm[1]);
    }
    expect(lastmod.size, "posts no sitemap").toBeGreaterThanOrEqual(3);
    let conferidos = 0;
    for (const s of slugs) {
      if (!lastmod.has(s)) continue;
      await page.goto(`/blog/${s}/`);
      const no = await jsonLdArtigo(page);
      expect(dia(lastmod.get(s)!), `lastmod de ${s}`).toBe(await diaEsperadoDeModificacao(page, no));
      conferidos++;
      if (conferidos >= 6) break;
    }
    expect(conferidos).toBeGreaterThanOrEqual(3);
  });

  test("layout: sem rolagem horizontal em 360x740 e caixa cabe na largura", async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width: 360, height: 740 }, locale: "pt-BR" });
    const page = await ctx.newPage();
    await page.goto(`/blog/${slug}/`);
    const caixa = page.locator("aside.caixa-autor");
    await caixa.scrollIntoViewIfNeeded();
    // Tabela larga no corpo do artigo estoura o viewport já em produção (anterior ao PR):
    // a rolagem horizontal é medida num artigo sem tabela; a caixa é medida em qualquer um.
    let semTabela = (await page.locator(".artigo-texto table").count()) === 0;
    for (const s of slugs) {
      if (semTabela) break;
      await page.goto(`/blog/${s}/`);
      semTabela = (await page.locator(".artigo-texto table").count()) === 0;
    }
    test.info().annotations.push({ type: "artigo-medido", description: page.url() });
    expect(semTabela, "algum artigo sem tabela para medir a rolagem horizontal").toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await caixa.scrollIntoViewIfNeeded();
    const b = await caixa.boundingBox();
    expect(b!.x).toBeGreaterThanOrEqual(0);
    expect(b!.x + b!.width).toBeLessThanOrEqual(360);
    await caixa.screenshot({ path: `${PASTA}/caixa-autor-360.png` });
    await page.locator(".artigo-meta").scrollIntoViewIfNeeded();
    await page.locator(".artigo-meta").screenshot({ path: `${PASTA}/assinatura-360.png` });
    await ctx.close();
  });
});

test("/sobre/: meta description inalterada", async ({ page }) => {
  await page.goto("/sobre/");
  await expect(page.locator('meta[name="description"]').first()).toHaveAttribute("content", DESCRICAO_SOBRE);
});

testeAdmin.describe("admin: campo Revisado em (sem salvar)", () => {
  testeAdmin.use({ storageState: ESTADO_ADMIN });

  testeAdmin("editor de post tem o campo e o texto de ajuda", async ({ page }, info) => {
    testeAdmin.skip(info.project.name === "mobile", "admin só roda no projeto desktop");
    testeAdmin.skip(!process.env.E2E_EMAIL, MOTIVO_SEM_QA);
    mkdirSync(PASTA, { recursive: true });
    await abrirAdmin(page, "/admin/posts/");
    const editar = page.getByRole("link", { name: /^Editar artigo "/ }).first();
    await expect(editar).toBeVisible();
    await editar.click();
    await page.waitForURL(/\/admin\/posts\/[^/]+\/?$/);
    const campo = page.getByLabel("Revisado em");
    await expect(campo).toBeVisible();
    await expect(campo).toHaveAttribute("placeholder", "dd/mm/aaaa");
    await expect(page.locator("#revisado_em_ajuda")).toContainText("Preencha só quando o conteúdo for revisado");
    await expect(campo).toHaveAttribute("aria-describedby", "revisado_em_ajuda");
    await campo.scrollIntoViewIfNeeded();
    const rotulo = await page.locator("label[for=revisado_em]").boundingBox();
    const ajuda = await page.locator("#revisado_em_ajuda").boundingBox();
    const x = Math.max(0, Math.min(rotulo!.x, ajuda!.x) - 12);
    const y = Math.max(0, rotulo!.y - 12);
    const largura = Math.max(rotulo!.width, ajuda!.width) + 24;
    const altura = ajuda!.y + ajuda!.height - rotulo!.y + 24;
    await page.screenshot({ path: `${PASTA}/admin-revisado-em.png`, clip: { x, y, width: largura, height: altura } });
  });
});
