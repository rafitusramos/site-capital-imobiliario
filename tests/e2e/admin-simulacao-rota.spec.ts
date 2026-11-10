import { expect, test } from "@playwright/test";

/*
 * SOMENTE LEITURA, sem login: a rota da simulação (que gera PDF e pode enviar
 * e-mail) tem de recusar quem não está autenticado ANTES de ler o corpo ou
 * subir o Chromium. O corpo abaixo é inválido de propósito e usa um lead
 * inexistente: se a rota chegasse a processá-lo, não haveria o que enviar.
 * Nada aqui gera PDF, move lead ou envia e-mail.
 */
const ROTA = "/api/admin/crm/simulacao/";

test.describe("POST /api/admin/crm/simulacao/ sem login", () => {
  test("responde 401 em JSON e não devolve PDF", async ({ request }) => {
    const resposta = await request.post(ROTA, {
      data: { acao: "previa", leadId: "00000000-0000-4000-8000-000000000000", dados: {} },
      maxRedirects: 0,
    });
    expect(resposta.status()).toBe(401);
    expect(resposta.headers()["content-type"]).toContain("application/json");
    expect(resposta.headers()["content-type"]).not.toContain("pdf");
    const corpo = await resposta.json();
    expect(corpo.erro).toMatch(/sessão/i);
  });

  test("a ação de envio também responde 401", async ({ request }) => {
    const resposta = await request.post(ROTA, {
      data: { acao: "enviar", leadId: "00000000-0000-4000-8000-000000000000", dados: {} },
      maxRedirects: 0,
    });
    expect(resposta.status()).toBe(401);
  });

  test("GET não é aceito", async ({ request }) => {
    const resposta = await request.get(ROTA, { maxRedirects: 0 });
    expect(resposta.status()).toBe(405);
  });
});
