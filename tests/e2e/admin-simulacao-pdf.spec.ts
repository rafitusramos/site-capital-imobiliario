import type { Request } from "@playwright/test";
import { abrirAdmin, abrirModalDoLead, ESTADO_ADMIN, expect, test } from "./apoio/admin";

/*
 * Geração do PDF da simulação (puppeteer-core + @sparticuz/chromium) — regressão de dependências.
 *
 * Só a ação `previa`: ela gera e devolve o PDF e NÃO grava nada nem envia e-mail
 * (docs/crm-spec.md §3.7). Proibido aqui: `anexar`, `enviar`, mover lead.
 * O `leadId` é de um lead de financiamento já existente, lido do próprio quadro
 * (a Server Action de LEITURA que abre o modal carrega o id). Nenhum lead é criado e
 * nenhum dado real do lead é gravado no relatório. Números da simulação são fictícios.
 */
test.use({ storageState: ESTADO_ADMIN });
test.setTimeout(120_000);

const ROTA = "/api/admin/crm/simulacao/";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

const MESES = [1, 12, 60, 360];
const dadosFicticios = {
  data: "27/11/2026",
  valor_imovel: 500000,
  valor_financiamento: 400000,
  renda_media: 12000,
  meses: MESES,
  bancos: [
    {
      nome: "Banco Teste",
      taxa: 10.5,
      cet: 11.2,
      custo_total: 820000,
      prazo: 360,
      indexador: "TR",
      sistema: "SAC",
      primeira: 4200,
      ultima: 1500,
      parcelas: [4200, 4000, 3000, 1500],
      logo: null,
    },
  ],
};

test.describe("POST /api/admin/crm/simulacao/ (ação previa) autenticado", () => {
  test("gera um PDF válido para um lead de financiamento", async ({ page }) => {
    let leadId: string | null = null;
    page.on("request", (req: Request) => {
      if (req.method() === "POST" && "next-action" in req.headers() && !leadId) {
        leadId = UUID.exec(req.postData() ?? "")?.[0] ?? null;
      }
    });

    await abrirAdmin(page, "/admin/crm/financiamento/");
    const editar = page.getByRole("button", { name: "Editar lead" });
    test.skip((await editar.count()) === 0, "nenhum lead de financiamento visível no CRM");
    const modal = await abrirModalDoLead(page, editar.first());
    await expect(modal).toBeVisible();
    await expect.poll(() => leadId, { message: "id do lead lido da Server Action de leitura" }).not.toBeNull();

    const resposta = await page.request.post(ROTA, {
      data: { acao: "previa", leadId, dados: dadosFicticios },
      maxRedirects: 0,
    });
    const tipo = resposta.headers()["content-type"] ?? "";
    expect(resposta.status(), `status (corpo: ${tipo.includes("json") ? await resposta.text() : "<binário>"})`).toBe(200);
    expect(tipo).toContain("application/pdf");
    const corpo = await resposta.body();
    expect(corpo.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(corpo.length, "PDF não pode ser vazio").toBeGreaterThan(5_000);
  });
});
