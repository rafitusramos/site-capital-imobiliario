import { expect, test } from "@playwright/test";
import { ListagemImoveisPage } from "./paginas/listagem-imoveis.page";

test.describe("/imoveis/ — listagem", () => {
  test("carrega com h1 e cards que levam a /imoveis/<slug>/", async ({ page }) => {
    const listagem = new ListagemImoveisPage(page);
    await listagem.goto();

    await expect(listagem.titulo).toBeVisible();
    await expect(listagem.cards.first()).toBeVisible();

    for (const href of await listagem.hrefs()) {
      expect(href, "href do card").toMatch(/^\/imoveis\/[^/]+\/$/);
    }
  });

  test("filtro Lançamento / Pronto é coerente com os cards publicados", async ({ page }) => {
    const listagem = new ListagemImoveisPage(page);
    await listagem.goto();
    await expect(listagem.cards.first()).toBeVisible();

    // Sem as duas modalidades publicadas o grupo nem é renderizado; com elas,
    // cada recorte tem de ter cards e os dois juntos têm de somar o total.
    if ((await listagem.filtroModalidade.count()) === 0) return;

    const total = await listagem.cards.count();
    const grupo = listagem.filtroModalidade;
    // aria-pressed confirma que o React já re-renderizou antes de contar.
    const recorte = async (nome: string) => {
      const botao = grupo.getByRole("button", { name: nome, exact: true });
      await botao.click();
      await expect(botao).toHaveAttribute("aria-pressed", "true");
      return listagem.cards.count();
    };
    const lancamentos = await recorte("Lançamento");
    const prontos = await recorte("Pronto");

    expect(lancamentos, "cards de lançamento").toBeGreaterThan(0);
    expect(prontos, "cards de imóvel pronto").toBeGreaterThan(0);
    expect(lancamentos + prontos).toBe(total);

    await grupo.getByRole("button", { name: "Lançamento e pronto", exact: true }).click();
    await expect(listagem.cards).toHaveCount(total);
  });
});
