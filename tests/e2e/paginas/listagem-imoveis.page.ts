import { expect, type Locator, type Page } from "@playwright/test";

export class ListagemImoveisPage {
  readonly titulo: Locator;
  readonly cards: Locator;
  readonly filtroModalidade: Locator;

  constructor(readonly page: Page) {
    this.titulo = page.getByRole("heading", { level: 1 });
    this.cards = page.locator("a.im-card");
    this.filtroModalidade = page.getByRole("group", { name: "Filtrar por lançamento ou imóvel pronto" });
  }

  async goto() {
    const resposta = await this.page.goto("/imoveis/");
    expect(resposta?.status()).toBe(200);
  }

  async hrefs(): Promise<string[]> {
    return this.cards.evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
  }

  /** Cards cuja fase é "pronto" (modalidade pronto sempre tem a fase pronto). */
  cardsProntos(): Locator {
    return this.cards.filter({ has: this.page.locator('.im-badge-fase[data-fase="pronto"]') });
  }
}
