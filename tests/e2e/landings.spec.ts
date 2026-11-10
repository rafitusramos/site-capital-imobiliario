import { expect, test } from "@playwright/test";
import { LandingPage, SimuladorFinanciamento } from "./paginas/landing.page";
import { lerJsonLd, tiposJsonLd } from "./apoio/pagina";

// Nenhum formulário é enviado aqui: enviar cria lead real e dispara e-mail.

for (const caminho of ["/financiamento/", "/home_equity/"]) {
  test.describe(`${caminho} — landing`, () => {
    test("FAQ tem 9 perguntas e cada uma abre e fecha", async ({ page }) => {
      const landing = new LandingPage(page, caminho);
      await landing.goto();

      await expect(landing.faqs).toHaveCount(9);
      for (let i = 0; i < 9; i++) {
        const item = landing.faqs.nth(i);
        await item.scrollIntoViewIfNeeded();
        await item.locator("summary").click();
        await expect(item, `pergunta ${i + 1} abre`).toHaveJSProperty("open", true);
        await item.locator("summary").click();
        await expect(item, `pergunta ${i + 1} fecha`).toHaveJSProperty("open", false);
      }
    });

    test("JSON-LD tem Service, BreadcrumbList e FAQPage", async ({ page }) => {
      await new LandingPage(page, caminho).goto();
      const tipos = tiposJsonLd(await lerJsonLd(page));
      for (const tipo of ["Service", "BreadcrumbList", "FAQPage"]) {
        expect(tipos, `JSON-LD ${tipo}`).toContain(tipo);
      }
    });

    test('bloco "Leia também" tem 3 artigos do blog', async ({ page }) => {
      const landing = new LandingPage(page, caminho);
      await landing.goto();
      expect(await landing.artigosLeiaTambem()).toHaveLength(3);
    });
  });
}

test.describe("/financiamento/ — taxas de mercado de outubro/2026", () => {
  test.beforeEach(async ({ page }) => {
    await new LandingPage(page, "/financiamento/").goto();
  });

  test('card "Entre bancos" mostra ~3,3 p.p.', async ({ page }) => {
    const card = page.locator(".cel").filter({ hasText: "Entre bancos" });
    await expect(card).toContainText("~3,3 p.p.");
  });

  // Linhas da tabela por texto (no mobile a tabela vira cards; toContainText independe do layout).
  const linhas = [
    { cenario: "Balcão mais caro", taxa: "15% a.a. + TR", parcela: "R$ 11.594", total: "≈ R$ 2,49 mi", nota: "R$ 355 mil a mais que a melhor taxa" },
    { cenario: "Taxa média de balcão", taxa: "13,25% a.a. + TR", parcela: "R$ 10.561", total: "≈ R$ 2,31 mi", nota: "R$ 169 mil a mais que a melhor taxa" },
    { cenario: "Melhor taxa em cotação", taxa: "11,69% a.a. + TR", parcela: "R$ 9.627", total: "≈ R$ 2,14 mi", nota: "" },
  ];
  for (const l of linhas) {
    test(`tabela comparativa: linha "${l.cenario}"`, async ({ page }) => {
      const linha = page.locator("table.tabela tbody tr").filter({ hasText: l.cenario });
      await expect(linha).toHaveCount(1);
      for (const trecho of [l.taxa, l.parcela, l.total, l.nota].filter(Boolean)) {
        await expect(linha, trecho).toContainText(trecho);
      }
    });
  }

  test('avisos citam "outubro/2026" e a página não tem valores antigos', async ({ page }) => {
    const avisos = page.locator("p.disclaimer");
    await expect(avisos).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(avisos.nth(i), `aviso ${i + 1}`).toContainText("outubro/2026");
    }
    await expect(avisos.last()).toContainText("(11,69% a 15% a.a.)");

    const texto = (await page.locator("body").textContent()) ?? "";
    for (const velho of ["julho/2026", "13,99%", "2,3 p.p."]) {
      expect(texto, `não deve conter "${velho}"`).not.toContain(velho);
    }
  });
});

test.describe("/financiamento/ — simulador", () => {
  test("alternar de SAC para PRICE muda o texto da parcela", async ({ page }) => {
    await new LandingPage(page, "/financiamento/").goto();
    const simulador = new SimuladorFinanciamento(page);

    await simulador.parcela.scrollIntoViewIfNeeded();
    await expect(simulador.sac).toHaveAttribute("aria-checked", "true");
    const antes = (await simulador.parcela.textContent()) ?? "";
    expect(antes).toMatch(/R\$/);

    await simulador.escolher(simulador.price);
    await expect(simulador.parcela).not.toHaveText(antes);
    await expect(page.getByText("Parcela fixa aproximada")).toBeVisible();
  });
});

// Data de nascimento (migration 033): obrigatória nos dois modais de lead. Só abre o
// modal e mede; "Próximo" com campos vazios apenas exibe erros, nada é enviado.
const modais = [
  { caminho: "/financiamento/", botao: "Solicitar pré-aprovação sem custo" },
  { caminho: "/home_equity/", botao: "Solicitar análise sem custo" },
];
for (const { caminho, botao } of modais) {
  test.describe(`${caminho} — modal de lead, data de nascimento`, () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("campo existe com label e o botão de navegação fica visível sem rolar", async ({ page }) => {
      await new LandingPage(page, caminho).goto();
      const abrir = page.getByRole("button", { name: botao });
      const painel = page.locator(".scrim.aberto .painel");
      // Clique antes da hidratação é perdido: repete até o modal abrir.
      await expect(async () => {
        await abrir.click();
        await expect(painel).toBeVisible({ timeout: 1_000 });
      }).toPass();

      const campo = painel.getByLabel("Data de nascimento");
      await expect(campo).toBeVisible();
      await expect(campo).toHaveAttribute("autocomplete", "bday");
      await expect(campo).toHaveAttribute("inputmode", "numeric");

      const avancar = painel.locator(".form-nav .cta");
      const cabe = async () => {
        const caixa = await avancar.boundingBox();
        const altura = page.viewportSize()!.height;
        expect(caixa, "botão do formulário").not.toBeNull();
        expect(caixa!.y).toBeGreaterThanOrEqual(0);
        expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(altura);
      };
      await cabe();

      // Com as mensagens de erro à mostra continua à vista (não envia: etapa 1 inválida).
      await avancar.click();
      await expect(painel.getByText("Informe uma data de nascimento válida.")).toBeVisible();
      await cabe();
    });
  });
}

// Máscara e recusa de data (cliente apenas; nunca chega ao envio final).
for (const { caminho, botao } of modais) {
  test.describe(`${caminho} — data de nascimento, máscara e validação`, () => {
    async function abrirModal(page: import("@playwright/test").Page) {
      await new LandingPage(page, caminho).goto();
      const painel = page.locator(".scrim.aberto .painel");
      await expect(async () => {
        await page.getByRole("button", { name: botao }).click();
        await expect(painel).toBeVisible({ timeout: 1_000 });
      }).toPass();
      return painel;
    }

    test("aplica a máscara dd/mm/aaaa", async ({ page }) => {
      const painel = await abrirModal(page);
      const campo = painel.getByLabel("Data de nascimento");
      await campo.pressSequentially("15031990");
      await expect(campo).toHaveValue("15/03/1990");
    });

    for (const [rotulo, valor] of [
      ["futura", "01012099"],
      ["inexistente", "31021990"],
      ["incompleta", "1503"],
    ] as const) {
      test(`recusa data ${rotulo}`, async ({ page }) => {
        const painel = await abrirModal(page);
        const campo = painel.getByLabel("Data de nascimento");
        await campo.pressSequentially(valor);
        await painel.locator(".form-nav .cta").click();
        await expect(painel.getByText("Informe uma data de nascimento válida.")).toBeVisible();
      });
    }

    test("botão de navegação visível sem rolar em viewport desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      const painel = await abrirModal(page);
      const caixa = await painel.locator(".form-nav .cta").boundingBox();
      expect(caixa).not.toBeNull();
      expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(720);
    });
  });
}
