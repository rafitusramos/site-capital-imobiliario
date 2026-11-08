import { abrirAdmin, ESTADO_ADMIN, expect, test } from "./apoio/admin";
import { coletarErros } from "./apoio/pagina";

/*
 * SOMENTE LEITURA — todo deploy usa o MESMO banco de produção. As taxas dos
 * simuladores e os interruptores de e-mail ao lead NÃO podem ser alterados:
 * este spec só lê. A fixture `acoesServidor` aborta qualquer Server Action
 * nesta tela (alternar um interruptor dispararia e-mails reais).
 */
test.use({ storageState: ESTADO_ADMIN });

test.describe("/admin/parametros/", () => {
  test("carrega sem erro de hidratação e mostra as taxas preenchidas", async ({ page, baseURL, acoesServidor }) => {
    const erros = coletarErros(page, baseURL!);
    await abrirAdmin(page, "/admin/parametros/");

    await expect(page.getByRole("heading", { name: "Taxas dos Simuladores" })).toBeVisible();
    await expect(page.getByLabel("Taxa de financiamento")).not.toHaveValue("");
    await expect(page.getByLabel("Taxa de home equity")).not.toHaveValue("");

    const hidratacao = erros.proprios.filter((e) => /#418|#423|#425|hydrat/i.test(e));
    expect(hidratacao, "erros de hidratação (React #418)").toEqual([]);
    expect(acoesServidor).toEqual([]);
  });

  test('seção "E-mails do CRM" tem os interruptores por etapa', async ({ page }) => {
    await abrirAdmin(page, "/admin/parametros/");
    await expect(page.getByRole("heading", { name: "E-mails do CRM" })).toBeVisible();
    const interruptores = page.getByRole("switch", { name: /^Enviar e-mail ao lead ao entrar em / });
    expect(await interruptores.count(), "interruptores de e-mail").toBeGreaterThan(0);
    await expect(interruptores.first()).toBeVisible();
  });
});
