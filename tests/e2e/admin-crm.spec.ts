import { readFileSync } from "node:fs";
import { abrirAdmin, ESTADO_ADMIN, expect, test } from "./apoio/admin";
import { AdminCrmPage } from "./paginas/admin.page";

/*
 * SOMENTE LEITURA — todo deploy usa o MESMO banco de produção, e mover lead
 * envia e-mail a clientes reais. Proibido: arrastar card, botões de etapa,
 * "Arquivar lead", "Excluir definitivamente", salvar campo do modal.
 * Aqui só se filtra, exporta (download no navegador), abre o modal e fecha, e
 * abre o diálogo de exclusão para conferir o campo de motivo e Cancelar.
 */
test.use({ storageState: ESTADO_ADMIN });

const ORIGEM = "financiamento";

test.describe("/admin/crm/financiamento/ — quadro", () => {
  test("abas de origem mostram a contagem de leads", async ({ page }) => {
    await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
    const crm = new AdminCrmPage(page, ORIGEM);
    await expect(crm.abas).toHaveCount(4);
    for (const aba of await crm.abas.all()) {
      await expect(aba).toHaveText(/\d+/);
    }
  });

  test("filtros Parados e Sem lembrete entram na URL, sobrevivem ao reload e saem ao desligar", async ({ page }) => {
    await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
    const crm = new AdminCrmPage(page, ORIGEM);

    await crm.alternar(crm.parados, true);
    await expect(page).toHaveURL(/parados=1/);
    await crm.alternar(crm.semLembrete, true);
    await expect(page).toHaveURL(/sem_lembrete=1/);

    await page.reload();
    await expect(crm.parados).toHaveAttribute("aria-pressed", "true");
    await expect(crm.semLembrete).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/parados=1/);

    await crm.alternar(crm.parados, false);
    await crm.alternar(crm.semLembrete, false);
    await expect(page).not.toHaveURL(/parados=1|sem_lembrete=1/);
  });

  test("Exportar CSV baixa leads-financiamento-AAAA-MM-DD.csv com cabeçalho", async ({ page }) => {
    await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
    const crm = new AdminCrmPage(page, ORIGEM);
    test.skip((await crm.exportar.count()) === 0, "botão Exportar CSV só existe para admin");

    // O clique pode cair antes da hidratação; repete até o download acontecer.
    let download;
    await expect(async () => {
      [download] = await Promise.all([page.waitForEvent("download", { timeout: 2_000 }), crm.exportar.click()]);
    }).toPass();

    expect(download!.suggestedFilename()).toMatch(/^leads-financiamento-\d{4}-\d{2}-\d{2}\.csv$/);
    const caminho = await download!.path();
    const primeiraLinha = readFileSync(caminho, "utf8").replace(/^﻿/, "").split(/\r?\n/)[0];
    expect(primeiraLinha).toContain("Protocolo");
    expect(primeiraLinha).toContain("Nome");
    expect(primeiraLinha).toContain("Etapa");
    await download!.delete();
  });

  test("abre o modal do lead e fecha sem alterar nada", async ({ page, acoesServidor }) => {
    await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
    const editar = page.getByRole("button", { name: "Editar lead" });
    test.skip((await editar.count()) === 0, "nenhum lead nesta aba");

    await editar.first().click();
    const modal = page.getByRole("dialog", { name: /^Lead / });
    await expect(modal).toBeVisible();
    await expect(page).toHaveURL(/lead=/);

    await modal.getByRole("button", { name: "Fechar" }).click();
    await expect(modal).toBeHidden();
    await expect(page).not.toHaveURL(/lead=/);
    // Carregar o detalhe pode ser uma action de leitura; nenhuma de movimento é esperada.
    test.info().annotations.push({ type: "actions no CRM", description: String(acoesServidor.length) });
  });
});

test.describe("/admin/crm/arquivados/", () => {
  test("diálogo de exclusão exige motivo e Cancelar não exclui", async ({ page, acoesServidor }) => {
    await abrirAdmin(page, "/admin/crm/arquivados/");
    await expect(page.getByRole("heading", { name: "Arquivados" })).toBeVisible();
    const excluir = page.getByRole("button", { name: "Excluir", exact: true });
    test.skip((await excluir.count()) === 0, "sem leads arquivados ou usuário de QA não é admin");

    await excluir.first().click();
    const dialogo = page.getByRole("alertdialog");
    await expect(dialogo.getByRole("heading", { name: "Excluir lead definitivamente" })).toBeVisible();
    await expect(dialogo.getByLabel("Motivo da exclusão")).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Excluir definitivamente" })).toBeDisabled();

    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
    expect(acoesServidor, "nenhuma Server Action deve ser disparada").toEqual([]);
  });
});
