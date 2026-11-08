import { expect, test, type Page } from "@playwright/test";
import { ImovelPage, ORDEM_PRONTO } from "./paginas/imovel.page";
import { ListagemImoveisPage } from "./paginas/listagem-imoveis.page";
import { canonicalDaPagina, lerJsonLd, metaContent, tiposJsonLd } from "./apoio/pagina";

/** Requisição de imagem de galeria/hero: otimizador do Next ou bucket do Supabase. */
const ehRequisicaoDeImagem = (url: string) => url.includes("/_next/image") || url.includes("imovel-images");

async function primeiroImovel(page: Page): Promise<string> {
  const listagem = new ListagemImoveisPage(page);
  await listagem.goto();
  const hrefs = await listagem.hrefs();
  test.skip(hrefs.length === 0, "nenhum imóvel publicado");
  return hrefs[0];
}

test.describe("/imoveis/<slug>/ — página do primeiro imóvel da listagem", () => {
  test("metadados e dados estruturados", async ({ page }) => {
    const caminho = await primeiroImovel(page);
    await new ImovelPage(page).goto(caminho);

    await expect(page).toHaveTitle(/\S/);
    expect(await metaContent(page, 'meta[name="description"]'), "meta description").not.toBe("");
    expect(await canonicalDaPagina(page), "canonical").toMatch(new RegExp(`${caminho}$`));

    const tipos = tiposJsonLd(await lerJsonLd(page));
    expect(tipos.some((t) => t === "Product" || t === "Residence"), `Product ou Residence em ${tipos}`).toBe(true);
    expect(tipos).toContain("BreadcrumbList");
  });

  test("hero carrega pelo otimizador /_next/image", async ({ page }) => {
    const caminho = await primeiroImovel(page);
    const imovel = new ImovelPage(page);
    await imovel.goto(caminho);

    await expect(imovel.heroImagem).toBeVisible();
    await expect(imovel.heroImagem).toHaveAttribute("src", /\/_next\/image/);
    await expect
      .poll(() => imovel.heroImagem.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  });

  test("orçamento de imagens: poucas antes de rolar, galerias carregam ao chegar perto", async ({ page }) => {
    const caminho = await primeiroImovel(page);
    const imagens: string[] = [];
    page.on("request", (req) => {
      if (ehRequisicaoDeImagem(req.url())) imagens.push(req.url());
    });

    const imovel = new ImovelPage(page);
    await imovel.goto(caminho);
    await expect(imovel.heroImagem).toBeVisible();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);

    expect(imagens.length, `imagens pedidas antes de rolar:\n${imagens.join("\n")}`).toBeLessThanOrEqual(6);

    const total = await imovel.carrosseis.count();
    test.skip(total === 0, "imóvel sem carrossel");

    // Uma galeria distante da dobra ainda não deve ter nenhuma <img>.
    if (total > 1) {
      await expect(imovel.carrosseis.last().locator("img")).toHaveCount(0);
    }

    const primeiro = imovel.carrosseis.first();
    await primeiro.scrollIntoViewIfNeeded();
    await expect(primeiro.locator("img").first()).toBeVisible();
    expect(await primeiro.locator("img").count(), "slides com <img> após rolar").toBeGreaterThan(0);
  });

  test("carrossel: slide ativo cabe na tela e mostra a legenda", async ({ page }, testInfo) => {
    const caminho = await primeiroImovel(page);
    const imovel = new ImovelPage(page);
    await imovel.goto(caminho);
    const total = await imovel.carrosseis.count();
    test.skip(total === 0, "imóvel sem carrossel");

    const carrossel = imovel.carrosseis.first();
    await carrossel.scrollIntoViewIfNeeded();
    const ativo = imovel.slideAtivo(carrossel);
    const imagem = ativo.locator("img").first();
    await expect(imagem).toBeVisible();

    const largura = page.viewportSize()?.width ?? 0;
    const caixa = await ativo.boundingBox();
    expect(caixa, "boundingBox do slide ativo").not.toBeNull();

    if (testInfo.project.name === "mobile") {
      expect(caixa!.x, "slide ativo começa dentro da tela").toBeGreaterThanOrEqual(-1);
      expect(caixa!.x + caixa!.width, "slide ativo termina dentro da tela").toBeLessThanOrEqual(largura + 1);
    } else {
      expect(largura).toBeGreaterThanOrEqual(1024);
      const caixaImagem = await imagem.boundingBox();
      expect(caixaImagem!.width, "largura da imagem ativa (~540px)").toBeGreaterThanOrEqual(486);
      expect(caixaImagem!.width).toBeLessThanOrEqual(594);
    }

    const legenda = ativo.locator(".im-carrossel-legenda");
    if ((await legenda.count()) > 0) await expect(legenda).toBeVisible();
  });

  test("imóvel pronto: ordem das seções e ausência das de lançamento", async ({ page }) => {
    const listagem = new ListagemImoveisPage(page);
    await listagem.goto();
    const prontos = await listagem.cardsProntos().evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));

    // A fase "pronto" também pode ser de um lançamento entregue; procuramos
    // o primeiro cuja página tem a seção exclusiva do pronto.
    const imovel = new ImovelPage(page);
    let achado = false;
    for (const href of prontos) {
      await imovel.goto(href);
      if ((await page.locator("#fotos-unidade").count()) > 0) {
        achado = true;
        break;
      }
    }
    test.skip(!achado, "nenhum imóvel pronto publicado");

    const presentes = await imovel.idsPresentes(ORDEM_PRONTO);
    const esperado = ORDEM_PRONTO.filter((id) => presentes.includes(id));
    expect(presentes, "ordem das seções do pronto").toEqual(esperado);
    expect(presentes).toContain("fotos-unidade");

    for (const id of ["fase-obra", "plantas", "realizacao"]) {
      await expect(page.locator(`#${id}`), `#${id} não deve existir em imóvel pronto`).toHaveCount(0);
    }

    // Condomínio e IPTU são custos do hero; a ficha da descrição não os repete.
    const fichaRotulos = page.locator("#descricao-unidade dt");
    await expect(fichaRotulos.filter({ hasText: /^(Condomínio|IPTU)$/ })).toHaveCount(0);
    const heroCustos = page.locator(".im-hero-custos");
    if ((await heroCustos.count()) > 0) {
      await expect(heroCustos).toContainText(/Condomínio|IPTU/);
    }
  });
});
