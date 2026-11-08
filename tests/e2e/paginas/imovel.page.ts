import { expect, type Locator, type Page } from "@playwright/test";

export const ORDEM_PRONTO = [
  "fotos-unidade",
  "descricao-unidade",
  "fotos-condominio",
  "condominio",
  "lazer",
  "diferenciais",
  "localizacao",
  "cta-final",
  "outros-imoveis",
] as const;

export class ImovelPage {
  readonly heroImagem: Locator;
  readonly carrosseis: Locator;

  constructor(readonly page: Page) {
    this.heroImagem = page.locator("img.im-hero-capa");
    this.carrosseis = page.locator(".im-carrossel");
  }

  async goto(caminho: string) {
    const resposta = await this.page.goto(caminho);
    expect(resposta?.status()).toBe(200);
  }

  /** Ids de seção presentes, na ordem em que aparecem no DOM. */
  async idsPresentes(ids: readonly string[]): Promise<string[]> {
    return this.page.evaluate((lista) => {
      const achados = lista
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
      achados.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      return achados.map((el) => el.id);
    }, ids as string[]);
  }

  slideAtivo(carrossel: Locator): Locator {
    return carrossel.locator(".im-carrossel-slide.ativo");
  }
}
