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

/*
 * Lote de melhorias do CRM (PR #72) — SOMENTE LEITURA. Nenhum clique em botão
 * de etapa: só se mede geometria, atributos e texto. Dado ausente = skip com motivo.
 */
test.describe("/admin/crm/financiamento/ — lote de melhorias", () => {
  test("card não mostra 'Últ. contato' nem 'Sem interação ainda'", async ({ page }) => {
    await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
    const cards = page.getByRole("button", { name: /^Lead .+, protocolo / });
    test.skip((await cards.count()) === 0, "nenhum lead nesta aba");
    await expect(cards.first()).toBeVisible();
    await expect(page.getByText(/Últ\. contato/)).toHaveCount(0);
    await expect(page.getByText(/Sem interação ainda/)).toHaveCount(0);
  });

  test("console sem erro de hidratação (React #418)", async ({ page }) => {
    const erros: string[] = [];
    page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
    page.on("pageerror", (e) => erros.push(e.message));
    await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
    await expect(page.getByRole("navigation", { name: "Origem dos leads" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const hidratacao = erros.filter((e) => /#418|#423|#425|hydrat/i.test(e));
    expect(hidratacao, hidratacao.join("\n")).toEqual([]);
  });

  test("contorno de lembrete atrasado: box-shadow --erro e borda esquerda de 3px", async ({ page }) => {
    await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
    const atrasado = page
      .getByRole("button", { name: /^Lead .+, protocolo / })
      .filter({ hasText: /Atrasado ·/ });
    test.skip((await atrasado.count()) === 0, "nenhum lead com lembrete atrasado nesta aba; estado amarelo (--aviso) idem: não exercitado");
    const card = atrasado.first();
    const erro = await page.evaluate(() => {
      const el = document.createElement("span");
      el.style.color = "var(--erro)";
      document.body.appendChild(el);
      const cor = getComputedStyle(el).color;
      el.remove();
      return cor;
    });
    const css = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return { sombra: s.boxShadow, borda: s.borderLeftWidth };
    });
    expect(css.sombra).toContain(erro);
    expect(css.borda).toBe("3px");
  });

  test.describe("modal do lead", () => {
    async function abrirModal(page: import("@playwright/test").Page) {
      await abrirAdmin(page, `/admin/crm/${ORIGEM}/`);
      const editar = page.getByRole("button", { name: "Editar lead" });
      test.skip((await editar.count()) === 0, "nenhum lead nesta aba");
      await editar.first().click();
      const modal = page.getByRole("dialog", { name: /^Lead / });
      await expect(modal).toBeVisible();
      await expect(modal.locator('[aria-current="step"]')).toBeVisible();
      return modal;
    }

    test("barra de etapa: etapa atual centralizada e botões com aria-label e altura >= 44px", async ({ page }) => {
      const modal = await abrirModal(page);
      const atual = modal.locator('[aria-current="step"]');
      const botoes = modal.getByRole("button", { name: /^(Mover para|Reabrir em) / });
      expect(await botoes.count(), "ao menos um botão de etapa").toBeGreaterThan(0);
      for (const b of await botoes.all()) {
        const alt = (await b.boundingBox())!.height;
        expect(alt, `altura de "${await b.getAttribute("aria-label")}"`).toBeGreaterThanOrEqual(44);
      }

      const medidas = await atual.evaluate((el) => {
        const grid = el.parentElement!;
        const g = grid.getBoundingClientRect();
        const ultimo = grid.lastElementChild!.getBoundingClientRect();
        const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
        const c = el.getBoundingClientRect();
        return { centro: c.left + c.width / 2, esperado: g.left + (g.width - ultimo.width - gap) / 2 };
      });
      expect(Math.abs(medidas.centro - medidas.esperado)).toBeLessThanOrEqual(2);
    });

    test("botão Perdido: só ícone, com title e aria-label; sem bloco 'Mover para' visível", async ({ page }) => {
      const modal = await abrirModal(page);
      await expect(modal.getByText(/^Mover para/)).toHaveCount(0);
      const perdido = modal.getByRole("button", { name: "Mover para Perdido" });
      test.skip((await perdido.count()) === 0, "lead aberto está em etapa final; botão Perdido não é exibido");
      expect((await perdido.innerText()).trim()).toBe("");
      await expect(perdido).toHaveAttribute("title", "Perdido");
      await expect(perdido).toHaveAttribute("aria-label", "Mover para Perdido");
      await expect(perdido.locator("svg")).toHaveCount(1);
    });

    test("colunas 'Dados do lead' e 'Origem' começam na mesma altura", async ({ page }) => {
      const modal = await abrirModal(page);
      const primeiroCampo = (titulo: string) =>
        modal
          .getByRole("heading", { name: new RegExp(`^${titulo}`) })
          .locator("xpath=../following-sibling::*[1]/*[1]");
      const dados = primeiroCampo("Dados do lead");
      const origem = primeiroCampo("Origem");
      test.skip((await origem.count()) === 0, "painel Origem sem campos");
      const a = (await dados.boundingBox())!.y;
      const b = (await origem.boundingBox())!.y;
      expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
    });
  });
});
