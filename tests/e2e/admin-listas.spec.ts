import { abrirAdmin, ESTADO_ADMIN, expect, test } from "./apoio/admin";
import { AdminListaPage } from "./paginas/admin.page";

/*
 * SOMENTE LEITURA — todo deploy usa o MESMO banco de produção.
 * Nunca confirmar publicar/despublicar/excluir: os diálogos são abertos e
 * cancelados. A fixture `acoesServidor` aborta qualquer Server Action nestas
 * telas e este spec exige que nenhuma tenha sido tentada.
 */
test.use({ storageState: ESTADO_ADMIN });

for (const tipo of ["posts", "imoveis"] as const) {
  test.describe(`/admin/${tipo}/ — lista`, () => {
    test("busca filtra as linhas e limpar restaura o total", async ({ page }) => {
      await abrirAdmin(page, `/admin/${tipo}/`);
      const lista = new AdminListaPage(page, tipo);
      test.skip((await lista.linksEditar.count()) === 0, "lista vazia");

      const total = await lista.linksEditar.count();
      const titulo = await lista.tituloDaPrimeiraLinha();
      expect(titulo).not.toBe("");

      await lista.busca.fill(titulo);
      await expect(lista.linksEditar.first()).toBeVisible();
      expect(await lista.linksEditar.count()).toBeLessThanOrEqual(total);
      await expect(page.getByRole("link", { name: `Editar ${tipo === "posts" ? "artigo" : "imóvel"} "${titulo}"` })).toBeVisible();

      await lista.busca.fill("zzzz-nao-existe-qa-e2e");
      await expect(lista.linksEditar).toHaveCount(0);
      await expect(page.getByText(/Nenhum .* encontrado com esses filtros/)).toBeVisible();

      await lista.busca.fill("");
      await expect(lista.linksEditar).toHaveCount(total);
    });

    test("filtro de status mantém o contador coerente com as linhas", async ({ page }) => {
      await abrirAdmin(page, `/admin/${tipo}/`);
      const lista = new AdminListaPage(page, tipo);
      test.skip((await lista.linksEditar.count()) === 0, "lista vazia");

      const valores = await lista.status.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
      expect(valores.length).toBeGreaterThan(1);
      for (const valor of valores) {
        await lista.status.selectOption(valor);
        const texto = (await lista.contador.textContent()) ?? "";
        const exibidos = Number(/^(\d+)/.exec(texto)?.[1]);
        await expect.poll(async () => lista.linksEditar.count(), { message: `status ${valor}: ${texto}` }).toBe(exibidos);
      }
    });

    test("cabeçalho ordenável alterna ascendente e descendente", async ({ page }) => {
      await abrirAdmin(page, `/admin/${tipo}/`);
      const lista = new AdminListaPage(page, tipo);
      test.skip((await lista.linksEditar.count()) === 0, "lista vazia");

      const coluna = tipo === "posts" ? "Título" : "Imóvel";
      await expect(lista.ordemDe(coluna)).toHaveAttribute("aria-sort", "none");
      await lista.cabecalho(coluna).click();
      await expect(lista.ordemDe(coluna)).toHaveAttribute("aria-sort", "ascending");
      await lista.cabecalho(coluna).click();
      await expect(lista.ordemDe(coluna)).toHaveAttribute("aria-sort", "descending");
    });

    test("botões de ação têm aria-label com o nome do item", async ({ page }) => {
      await abrirAdmin(page, `/admin/${tipo}/`);
      const lista = new AdminListaPage(page, tipo);
      test.skip((await lista.linksEditar.count()) === 0, "lista vazia");

      const rotulo = tipo === "posts" ? "artigo" : "imóvel";
      const titulo = await lista.tituloDaPrimeiraLinha();
      await expect(page.getByRole("button", { name: `Excluir ${rotulo} "${titulo}"` })).toBeVisible();
      await expect(
        page.getByRole("button", { name: new RegExp(`^(Publicar|Despublicar) ${rotulo} "${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"$`) }),
      ).toBeVisible();
    });

    test("publicar/despublicar abre diálogo do app e Cancelar não muda nada", async ({ page, acoesServidor }) => {
      await abrirAdmin(page, `/admin/${tipo}/`);
      const lista = new AdminListaPage(page, tipo);
      test.skip((await lista.linksEditar.count()) === 0, "lista vazia");

      const total = await lista.linksEditar.count();
      const botao = lista.botaoPublicacaoDaPrimeiraLinha();
      const rotuloAntes = await botao.getAttribute("aria-label");

      await botao.click();
      await expect(lista.dialogo).toBeVisible();
      await expect(lista.dialogo.getByRole("heading", { name: /^(Publicar|Despublicar) (artigo|imóvel)\?$/ })).toBeVisible();

      await lista.dialogo.getByRole("button", { name: "Cancelar" }).click();
      await expect(lista.dialogo).toBeHidden();

      await expect(botao).toHaveAttribute("aria-label", rotuloAntes!);
      await expect(lista.linksEditar).toHaveCount(total);
      expect(acoesServidor, "nenhuma Server Action deve ser disparada").toEqual([]);
    });
  });
}

test.describe("/admin/imoveis/ — chips de modalidade", () => {
  test("Todos = Lançamentos + Imóveis prontos", async ({ page }) => {
    await abrirAdmin(page, "/admin/imoveis/");
    const lista = new AdminListaPage(page, "imoveis");
    const grupo = page.getByRole("group", { name: "Filtrar por modalidade" });
    await expect(grupo).toBeVisible();

    const contar = async (nome: string) => {
      const chip = grupo.getByRole("button", { name: nome, exact: true });
      await chip.click();
      await expect(chip).toHaveAttribute("aria-pressed", "true");
      return lista.linksEditar.count();
    };
    const todos = await contar("Todos");
    const lancamentos = await contar("Lançamentos");
    const prontos = await contar("Imóveis prontos");
    expect(lancamentos + prontos).toBe(todos);
  });
});
