import { abrirAdmin, ESTADO_ADMIN, expect, test } from "./apoio/admin";
import { AdminListaPage } from "./paginas/admin.page";

/*
 * SOMENTE LEITURA — todo deploy usa o MESMO banco de produção.
 * Os editores são abertos e digitados, mas NUNCA salvos: nada de clicar em
 * Publicar/Salvar/Excluir. A fixture `acoesServidor` aborta e registra qualquer
 * Server Action e cada teste exige que a lista esteja vazia.
 */
test.use({ storageState: ESTADO_ADMIN });

test.describe("/admin/posts/<id> — editor de artigo", () => {
  test("alteração não salva dispara o diálogo de descarte, sem gravar nada", async ({ page, acoesServidor }) => {
    await abrirAdmin(page, "/admin/posts/");
    const lista = new AdminListaPage(page, "posts");
    test.skip((await lista.linksEditar.count()) === 0, "nenhum artigo cadastrado");
    await lista.linksEditar.first().click();

    const resumo = page.getByLabel("Resumo", { exact: true });
    await expect(resumo).toBeVisible();
    const original = await resumo.inputValue();
    const urlDoEditor = page.url();

    await resumo.click();
    await resumo.press("ControlOrMeta+End");
    await resumo.pressSequentially("x");
    await expect(resumo).toHaveValue(`${original}x`);

    await page.getByRole("navigation", { name: "Navegação do painel administrativo" }).getByRole("link", { name: "Cadastro de Imóveis" }).click();

    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo.getByRole("heading", { name: "Descartar alterações?" })).toBeVisible();
    await dialogo.getByRole("button", { name: "Continuar editando" }).click();
    await expect(dialogo).toBeHidden();
    expect(page.url(), "continuou no editor").toBe(urlDoEditor);

    await resumo.fill(original);
    await expect(resumo).toHaveValue(original);
    expect(acoesServidor, "nenhuma Server Action deve ser disparada").toEqual([]);
  });
});

test.describe("/admin/imoveis/novo/ — cadastro novo", () => {
  test("pergunta a modalidade antes do formulário", async ({ page }) => {
    await abrirAdmin(page, "/admin/imoveis/novo/");
    await expect(page.getByRole("heading", { name: "Novo imóvel" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Lançamento/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Imóvel pronto/ })).toBeVisible();
  });

  test("modalidade pronto mostra a ficha da unidade e não tem tipologias", async ({ page, acoesServidor }) => {
    await abrirAdmin(page, "/admin/imoveis/novo/?modalidade=pronto");
    await expect(page.getByRole("heading", { name: "Novo imóvel pronto" })).toBeVisible();

    await expect(page.getByLabel("Área útil (m²)")).toBeVisible();
    await expect(page.getByLabel("Valor de venda (R$)")).toBeVisible();
    await expect(page.getByLabel("Descrição da unidade")).toBeVisible();
    await expect(page.getByRole("group", { name: "Foto de capa" }).getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("radio", { name: "Primeira foto da unidade" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Primeira foto do condomínio" })).toBeVisible();
    await expect(page.getByText("Tipologias", { exact: true })).toHaveCount(0);
    expect(acoesServidor).toEqual([]);
  });

  test("modalidade lançamento mantém a aba Tipologias", async ({ page }) => {
    await abrirAdmin(page, "/admin/imoveis/novo/?modalidade=lancamento");
    await expect(page.getByRole("heading", { name: "Novo lançamento" })).toBeVisible();
    await expect(page.getByText("Tipologias", { exact: true })).toBeVisible();
  });
});
