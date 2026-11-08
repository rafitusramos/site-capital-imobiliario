import { expect, type Locator, type Page } from "@playwright/test";

export class LandingPage {
  readonly faqs: Locator;
  readonly leiaTambemLinks: Locator;

  constructor(
    readonly page: Page,
    readonly caminho: string,
  ) {
    this.faqs = page.locator("details");
    this.leiaTambemLinks = page.locator('#leia-tambem a[href^="/blog/"]');
  }

  async goto() {
    const resposta = await this.page.goto(this.caminho);
    expect(resposta?.status()).toBe(200);
  }

  /** Hrefs distintos de artigos (/blog/<slug>/) no bloco "Leia também". */
  async artigosLeiaTambem(): Promise<string[]> {
    const hrefs = await this.leiaTambemLinks.evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
    return [...new Set(hrefs.filter((h) => /^\/blog\/[^/?#]+\/$/.test(h)))];
  }
}

export class SimuladorFinanciamento {
  readonly sac: Locator;
  readonly price: Locator;
  readonly parcela: Locator;

  constructor(page: Page) {
    this.sac = page.getByRole("radio", { name: "SAC", exact: true });
    this.price = page.getByRole("radio", { name: "PRICE", exact: true });
    this.parcela = page.locator(".sim-res").filter({ hasText: "Parcela" }).locator(".num");
  }

  /** Clica até a hidratação pegar (clique antes dela é perdido). */
  async escolher(opcao: Locator) {
    await expect(async () => {
      await opcao.click();
      await expect(opcao).toHaveAttribute("aria-checked", "true", { timeout: 1_000 });
    }).toPass();
  }
}
