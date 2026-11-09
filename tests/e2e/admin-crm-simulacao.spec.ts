import type { Page, Request } from "@playwright/test";
import { abrirAdmin, ESTADO_ADMIN, expect, test } from "./apoio/admin";

/*
 * Simulação de financiamento no CRM (PR #74) — SOMENTE LEITURA.
 *
 * Todo deploy usa o MESMO banco de produção e a rota pode enviar e-mail a
 * cliente real. Proibido aqui: "Mover e enviar", "Mover sem enviar", "Enviar",
 * botão de etapa, arrastar, `acao: "enviar"`. Só se abre o diálogo, anexa
 * arquivo FICTÍCIO que não é simulação (nunca gera prévia) e fecha.
 * A prévia só é pedida na rota com leadId inexistente (404 antes de gerar PDF).
 * Nenhum dado, nome ou protocolo de lead real entra nestes specs.
 */
test.use({ storageState: ESTADO_ADMIN });

const ROTA = "/api/admin/crm/simulacao/";
const LEAD_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

/** Registra toda chamada à rota da simulação e qualquer `acao: "enviar"`. */
function vigiarRede(page: Page) {
  const chamadas: { acao: string | null }[] = [];
  page.on("request", (req: Request) => {
    if (
      req.method() !== "POST" ||
      !new URL(req.url()).pathname.startsWith(ROTA.replace(/\/$/, ""))
    )
      return;
    let acao: string | null = null;
    try {
      acao =
        (JSON.parse(req.postData() ?? "{}") as { acao?: string }).acao ?? null;
    } catch {
      acao = null;
    }
    chamadas.push({ acao });
  });
  return chamadas;
}

/** Fecha o que foi aberto; proteção: nenhuma Server Action de mover nem envio. */
function semEnvioNemMovimento(
  chamadas: { acao: string | null }[],
  acoes: { url: string }[],
  base: number,
) {
  expect(
    chamadas.filter((c) => c.acao === "enviar"),
    'nenhum POST com acao "enviar"',
  ).toEqual([]);
  expect(chamadas, "nenhuma chamada à rota da simulação neste teste").toEqual(
    [],
  );
  // Abrir o modal dispara a Server Action de LEITURA do detalhe (`base`); depois disso, nenhuma outra.
  expect(
    acoes.length,
    "nenhuma Server Action nova (mover etc.) depois de abrir o modal",
  ).toBe(base);
}

/** `base`: Server Actions já disparadas quando o modal estabilizou (leitura do detalhe). */
async function abrirModalLead(
  page: Page,
  origem: string,
  semLead: string,
  acoes: { url: string }[],
) {
  await abrirAdmin(page, `/admin/crm/${origem}/`);
  const editar = page.getByRole("button", { name: "Editar lead" });
  test.skip((await editar.count()) === 0, semLead);
  await editar.first().click();
  const modal = page.getByRole("dialog", { name: /^Lead / });
  await expect(modal).toBeVisible();
  await expect(modal.locator('[aria-current="step"]')).toBeVisible();
  await page.waitForLoadState("networkidle");
  return { modal, base: acoes.length };
}

/** PDF mínimo e fictício, sem nada de simulação. */
function pdfFicticio(): Buffer {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const fluxo = "BT /F1 12 Tf 10 50 Td (Documento ficticio de teste) Tj ET";
  let pdf = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(pdf.length);
    const corpo =
      o ?? `<< /Length ${fluxo.length} >>\nstream\n${fluxo}\nendstream`;
    pdf += `${i + 1} 0 obj\n${corpo}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offs.forEach((o) => (pdf += `${String(o).padStart(10, "0")} 00000 n \n`));
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

test.describe("/admin/crm/financiamento/ — bloco Simulações", () => {
  test("modal de lead mostra o bloco Simulações e o botão Enviar simulação; sem histórico não quebra", async ({
    page,
    acoesServidor,
  }) => {
    const chamadas = vigiarRede(page);
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(e.message));
    const { modal, base } = await abrirModalLead(
      page,
      "financiamento",
      "nenhum lead em financiamento",
      acoesServidor,
    );

    await expect(
      modal.getByRole("heading", { name: "Simulações" }),
    ).toBeVisible();
    await expect(
      modal.getByRole("button", { name: "Enviar simulação" }),
    ).toBeVisible();
    // Sem a migration 030 (tabela ausente) a lista vem vazia; com ela, vem o histórico. Os dois são válidos.
    const vazio = modal.getByText(
      "Nenhuma simulação enviada a este lead ainda.",
    );
    const historico = modal.getByRole("button", { name: "Baixar PDF" });
    await expect(vazio.or(historico.first())).toBeVisible();
    test
      .info()
      .annotations.push({
        type: "histórico vazio",
        description: String(await vazio.isVisible()),
      });
    expect(erros, "sem exceção de página").toEqual([]);
    await modal.getByRole("button", { name: "Fechar" }).click();
    await expect(modal).toBeHidden();
    semEnvioNemMovimento(chamadas, acoesServidor, base);
  });

  test("Enviar simulação abre o diálogo: foco preso, input só PDF, Cancelar; Esc fecha só o diálogo", async ({
    page,
    acoesServidor,
  }) => {
    const chamadas = vigiarRede(page);
    const { modal, base } = await abrirModalLead(
      page,
      "financiamento",
      "nenhum lead em financiamento",
      acoesServidor,
    );
    await modal.getByRole("button", { name: "Enviar simulação" }).click();

    const dialogo = page.getByRole("dialog", { name: "Enviar simulação" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toHaveAttribute("aria-modal", "true");
    const arquivo = dialogo.getByLabel("PDF da Creditas");
    await expect(arquivo).toHaveAttribute("type", "file");
    await expect(arquivo).toHaveAttribute("accept", /pdf/);
    await expect(arquivo).not.toHaveAttribute("accept", /image|\*\/\*/);
    await expect(
      dialogo.getByRole("button", { name: "Cancelar" }),
    ).toBeVisible();
    // Antes de um PDF lido, o botão de envio não pode estar habilitado.
    await expect(
      dialogo.getByRole("button", { name: "Enviar simulação" }),
    ).toBeDisabled();

    // Foco preso: muitos Tabs nunca saem do diálogo.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const dentro = await page.evaluate(
        () =>
          !!document.activeElement?.closest(
            '[aria-modal="true"][aria-labelledby]',
          ),
      );
      expect(dentro, `foco dentro do diálogo após ${i + 1} Tab`).toBe(true);
      const naSimulacao = await page.evaluate(
        () =>
          document.activeElement
            ?.closest('[role="dialog"]')
            ?.querySelector("#simulacao-arquivo") !== null,
      );
      expect(
        naSimulacao,
        "foco no diálogo da simulação, não no modal do lead",
      ).toBe(true);
    }
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Shift+Tab");
      const naSimulacao = await page.evaluate(
        () =>
          document.activeElement
            ?.closest('[role="dialog"]')
            ?.querySelector("#simulacao-arquivo") !== null,
      );
      expect(naSimulacao, `foco preso no sentido inverso (${i + 1})`).toBe(
        true,
      );
    }

    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(modal).toBeVisible();
    await expect(page).toHaveURL(/lead=/);

    // Reabre e fecha por Cancelar.
    await modal.getByRole("button", { name: "Enviar simulação" }).click();
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(modal).toBeVisible();
    semEnvioNemMovimento(chamadas, acoesServidor, base);
  });

  test("arquivo que não é simulação Creditas: mensagem de erro clara e nenhuma prévia", async ({
    page,
    acoesServidor,
  }) => {
    const chamadas = vigiarRede(page);
    const { modal, base } = await abrirModalLead(
      page,
      "financiamento",
      "nenhum lead em financiamento",
      acoesServidor,
    );
    await modal.getByRole("button", { name: "Enviar simulação" }).click();
    const dialogo = page.getByRole("dialog", { name: "Enviar simulação" });
    await expect(dialogo).toBeVisible();

    await dialogo.getByLabel("PDF da Creditas").setInputFiles({
      name: "documento-ficticio.pdf",
      mimeType: "application/pdf",
      buffer: pdfFicticio(),
    });
    const alerta = dialogo.getByRole("alert");
    await expect(alerta).toBeVisible({ timeout: 20_000 });
    await expect(alerta).toContainText(/Creditas|PDF|ler|tabela|Bancos/i);
    await expect(dialogo.getByTitle("Prévia da simulação")).toHaveCount(0);
    await expect(
      dialogo.getByRole("button", { name: "Enviar simulação" }),
    ).toBeDisabled();
    await expect(
      dialogo.getByText("Melhor banco (menor CET em TR)"),
    ).toHaveCount(0);

    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
    semEnvioNemMovimento(chamadas, acoesServidor, base);
  });

  test("arquivo de texto com tipo diferente de PDF é recusado sem ler nem gerar prévia", async ({
    page,
    acoesServidor,
  }) => {
    const chamadas = vigiarRede(page);
    const { modal, base } = await abrirModalLead(
      page,
      "financiamento",
      "nenhum lead em financiamento",
      acoesServidor,
    );
    await modal.getByRole("button", { name: "Enviar simulação" }).click();
    const dialogo = page.getByRole("dialog", { name: "Enviar simulação" });
    await expect(dialogo).toBeVisible();

    await dialogo.getByLabel("PDF da Creditas").setInputFiles({
      name: "texto-ficticio.pdf",
      mimeType: "text/plain",
      buffer: Buffer.from("conteudo ficticio que nao e um PDF"),
    });
    await expect(dialogo.getByRole("alert")).toContainText(
      "Anexe o PDF da simulação da Creditas.",
    );
    await expect(dialogo.getByTitle("Prévia da simulação")).toHaveCount(0);
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
    semEnvioNemMovimento(chamadas, acoesServidor, base);
  });
});

test.describe("/admin/crm/home-equity/ — modal sem o bloco Simulações", () => {
  test("lead de home equity não tem 'Simulações' nem 'Enviar simulação'", async ({
    page,
    acoesServidor,
  }) => {
    const chamadas = vigiarRede(page);
    const { modal, base } = await abrirModalLead(
      page,
      "home-equity",
      "nenhum lead em home equity: bloco não verificável com dado real",
      acoesServidor,
    );
    await expect(
      modal.getByRole("heading", { name: "Simulações" }),
    ).toHaveCount(0);
    await expect(
      modal.getByRole("button", { name: "Enviar simulação" }),
    ).toHaveCount(0);
    await modal.getByRole("button", { name: "Fechar" }).click();
    await expect(modal).toBeHidden();
    semEnvioNemMovimento(chamadas, acoesServidor, base);
  });
});

test.describe("POST /api/admin/crm/simulacao/ autenticado — somente erros", () => {
  const banco = {
    nome: "Banco Ficticio",
    taxa: 10,
    cet: 11,
    custo_total: 1000,
    prazo: 360,
    indexador: "TR",
    sistema: "SAC",
    primeira: 100,
    ultima: 50,
    parcelas: [100, 90],
    logo: null,
  };
  const dadosFicticios = {
    data: "01/01/2026",
    valor_imovel: 500000,
    valor_financiamento: 400000,
    renda_media: null,
    meses: [1, 2],
    bancos: [banco],
  };

  test("prévia com dados fictícios e lead inexistente responde 404 em JSON, sem PDF", async ({
    request,
  }) => {
    const r = await request.post(ROTA, {
      data: { acao: "previa", leadId: LEAD_INEXISTENTE, dados: dadosFicticios },
      maxRedirects: 0,
    });
    test.skip(
      r.status() === 401,
      "sessão do usuário de QA não autenticou na rota",
    );
    expect(r.status()).toBe(404);
    expect(r.headers()["content-type"]).toContain("application/json");
    expect(r.headers()["content-type"]).not.toContain("pdf");
    expect((await r.json()).erro).toMatch(/não encontrado/i);
  });

  test("corpo inválido responde 400", async ({ request }) => {
    const r = await request.post(ROTA, {
      data: { acao: "previa", leadId: "nao-e-uuid", dados: {} },
      maxRedirects: 0,
    });
    test.skip(
      r.status() === 401,
      "sessão do usuário de QA não autenticou na rota",
    );
    expect(r.status()).toBe(400);
    expect((await r.json()).erro).toMatch(/inválid/i);
  });

  test("JSON malformado responde 400", async ({ request }) => {
    const r = await request.post(ROTA, {
      headers: { "Content-Type": "application/json" },
      data: "{nao e json",
      maxRedirects: 0,
    });
    test.skip(
      r.status() === 401,
      "sessão do usuário de QA não autenticou na rota",
    );
    expect(r.status()).toBe(400);
  });
});
