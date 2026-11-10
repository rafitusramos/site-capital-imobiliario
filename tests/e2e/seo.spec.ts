import { expect, test, type Page } from "@playwright/test";
import { canonicalDaPagina, coletarErros, lerJsonLd, metaContent } from "./apoio/pagina";

const PAGINAS_FIXAS = ["/", "/financiamento/", "/home_equity/", "/blog/", "/imoveis/", "/sobre/"];

async function primeiroArtigo(page: Page): Promise<string> {
  await page.goto("/blog/");
  const hrefs = await page
    .locator('a[href^="/blog/"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
  const artigo = hrefs.find((h) => /^\/blog\/[^/?#]+\/$/.test(h));
  test.skip(!artigo, "nenhum artigo publicado");
  return artigo!;
}

async function verificarPagina(page: Page, caminho: string, baseURL: string) {
  const erros = coletarErros(page, baseURL);
  const resposta = await page.goto(caminho);
  expect(resposta?.status(), `status de ${caminho}`).toBe(200);
  await page.waitForLoadState("load");

  await expect(page).toHaveTitle(/\S/);
  expect(await metaContent(page, 'meta[name="description"]'), "meta description").not.toBe("");
  const canonical = await canonicalDaPagina(page);
  expect(canonical, "canonical presente").not.toBe("");
  expect(canonical, "canonical termina em /").toMatch(/\/$/);

  if (erros.terceiros.length > 0) {
    test.info().annotations.push({ type: "ruído de terceiros", description: erros.terceiros.join("\n") });
  }
  expect(erros.proprios, "erros de console/página do próprio site").toEqual([]);
}

test.describe("SEO e saúde das páginas públicas", () => {
  for (const caminho of PAGINAS_FIXAS) {
    test(`${caminho}: 200, title, description, canonical e console limpo`, async ({ page, baseURL }) => {
      await verificarPagina(page, caminho, baseURL!);
    });
  }

  test("artigo do blog: 200, title, description, canonical e console limpo", async ({ page, baseURL }) => {
    const artigo = await primeiroArtigo(page);
    await verificarPagina(page, artigo, baseURL!);
  });

  test("/sitemap.xml lista imagens (<image:image>)", async ({ request }) => {
    const resposta = await request.get("/sitemap.xml");
    expect(resposta.status()).toBe(200);
    expect(await resposta.text()).toContain("<image:image>");
  });
});

type No = Record<string, unknown>;
const MAPS_CID = "https://www.google.com/maps?cid=1997059006678757798";
const noPorId = (nos: No[], sufixo: string) =>
  nos.find((n) => typeof n["@id"] === "string" && (n["@id"] as string).endsWith(sufixo));
const comoLista = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);

test.describe("JSON-LD: entidades (#negocio, #rafael, ProfilePage)", () => {
  test("home: #negocio com logo PNG, sameAs/hasMap do Maps e sem share.google", async ({ page }) => {
    await page.goto("/");
    const nos = await lerJsonLd(page);
    const negocio = noPorId(nos, "/#negocio");
    expect(negocio, "nó #negocio").toBeTruthy();
    const logo = negocio!.logo;
    const logoUrl = typeof logo === "string" ? logo : String((logo as No)?.url ?? "");
    expect(logoUrl).toMatch(/\/images\/logo-rt\.png$/);
    expect(comoLista(negocio!.sameAs)).toContain(MAPS_CID);
    expect(negocio!.hasMap).toBe(MAPS_CID);
    const brutos = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(brutos.join(" ")).not.toContain("share.google");
  });

  test("home: #rafael com url, image, sameAs e CRECI 283020-F", async ({ page }) => {
    await page.goto("/");
    const rafael = noPorId(await lerJsonLd(page), "/#rafael");
    expect(rafael, "nó #rafael").toBeTruthy();
    expect(String(rafael!.url)).toMatch(/\/sobre\/$/);
    expect(JSON.stringify(rafael!.image ?? "")).toMatch(/\S/);
    expect(comoLista(rafael!.sameAs).length).toBeGreaterThan(0);
    expect(JSON.stringify(rafael)).toContain('"identifier":"283020-F"');
  });

  test("home: #rafael inclui o LinkedIn no sameAs", async ({ page }) => {
    await page.goto("/");
    const rafael = noPorId(await lerJsonLd(page), "/#rafael");
    expect(rafael, "nó #rafael").toBeTruthy();
    expect(comoLista(rafael!.sameAs)).toContain(
      "https://www.linkedin.com/in/rafael-teixeira-capital-imobiliario/",
    );
  });

  test("home: #negocio declara atendimento 24h nos 7 dias", async ({ page }) => {
    await page.goto("/");
    const negocio = noPorId(await lerJsonLd(page), "/#negocio");
    expect(negocio, "nó #negocio").toBeTruthy();
    const horarios = comoLista(negocio!.openingHoursSpecification) as No[];
    expect(horarios.length).toBeGreaterThan(0);
    const h = horarios[0];
    expect(h["@type"]).toBe("OpeningHoursSpecification");
    expect(comoLista(h.dayOfWeek)).toHaveLength(7);
    expect(new Set(comoLista(h.dayOfWeek)).size).toBe(7);
    expect(h.opens).toBe("00:00");
    expect(h.closes).toBe("23:59");
  });

  test("/sobre/: ProfilePage aponta para #rafael, Person único e BreadcrumbList", async ({ page }) => {
    await page.goto("/sobre/");
    const nos = await lerJsonLd(page);
    const tipos = (n: No) => comoLista(n["@type"]).map(String);
    const perfil = nos.find((n) => tipos(n).includes("ProfilePage"));
    expect(perfil, "nó ProfilePage").toBeTruthy();
    expect(String((perfil!.mainEntity as No)["@id"])).toMatch(/\/#rafael$/);
    const pessoas = nos.filter(
      (n) => tipos(n).includes("Person") && String(n["@id"]).endsWith("/#rafael"),
    );
    expect(pessoas, "exatamente um Person #rafael").toHaveLength(1);
    expect(nos.some((n) => tipos(n).includes("BreadcrumbList")), "BreadcrumbList").toBe(true);
  });

  test("logo do negócio existe no host do deploy como image/png", async ({ request }) => {
    const r = await request.get("/images/logo-rt.png");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  });

  for (const caminho of PAGINAS_FIXAS) {
    test(`${caminho}: todo JSON-LD é JSON válido`, async ({ page }) => {
      await page.goto(caminho);
      const textos = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(textos.length).toBeGreaterThan(0);
      for (const t of textos) expect(() => JSON.parse(t)).not.toThrow();
    });
  }
});
