import { expect, type Locator, type Page } from "@playwright/test";

/** Lista de posts ou de imóveis (mesmos controles: BarraLista + ConfirmarAcao). */
export class AdminListaPage {
  readonly busca: Locator;
  readonly status: Locator;
  readonly contador: Locator;
  readonly linksEditar: Locator;
  readonly dialogo: Locator;

  constructor(
    readonly page: Page,
    readonly tipo: "posts" | "imoveis",
  ) {
    const rotulo = tipo === "posts" ? "artigo" : "imóvel";
    this.busca = page.getByRole("searchbox", { name: `Buscar ${rotulo}` });
    this.status = page.getByLabel("Status", { exact: true });
    this.contador = page.getByText(/\d+ no total|\d+ de \d+/);
    this.linksEditar = page.getByRole("link", { name: new RegExp(`^Editar ${rotulo} "`) });
    this.dialogo = page.getByRole("alertdialog");
  }

  /** Botão de publicar/despublicar (nunca o de excluir) da primeira linha. */
  botaoPublicacaoDaPrimeiraLinha(): Locator {
    return this.page.getByRole("button", { name: /^(Publicar|Despublicar) (artigo|imóvel) "/ }).first();
  }

  async tituloDaPrimeiraLinha(): Promise<string> {
    const nome = (await this.linksEditar.first().getAttribute("aria-label")) ?? "";
    return /"(.*)"$/.exec(nome)?.[1] ?? "";
  }

  cabecalho(nome: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(`^${nome}`) });
  }

  /** `aria-sort` mora no <span> que envolve o botão. */
  ordemDe(nome: string): Locator {
    return this.cabecalho(nome).locator("xpath=..");
  }
}

export class AdminCrmPage {
  readonly abas: Locator;
  readonly parados: Locator;
  readonly semLembrete: Locator;
  readonly exportar: Locator;

  constructor(
    readonly page: Page,
    readonly origem: string,
  ) {
    this.abas = page.getByRole("navigation", { name: "Origem dos leads" }).getByRole("link");
    this.parados = page.getByRole("button", { name: "Parados além do SLA" });
    this.semLembrete = page.getByRole("button", { name: "Sem lembrete" });
    this.exportar = page.getByRole("button", { name: "Exportar CSV" });
  }

  /** Clica até o React hidratar e o estado do botão refletir o clique. */
  async alternar(botao: Locator, pressionado: boolean) {
    await expect(async () => {
      await botao.click();
      await expect(botao).toHaveAttribute("aria-pressed", String(pressionado), { timeout: 1_000 });
    }).toPass();
  }
}
