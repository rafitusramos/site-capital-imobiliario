import { test as base, expect, type Locator, type Page } from "@playwright/test";

/**
 * POLÍTICA DE SEGURANÇA (ver tests/functional-tests/README.md): todo deploy usa
 * o MESMO banco de produção. Os specs de admin são SOMENTE LEITURA: nada de
 * confirmar exclusão, mover lead, publicar/despublicar, salvar ou enviar
 * formulário. Esta fixture é a rede de proteção: nas telas de posts, imóveis e
 * parâmetros (onde toda Server Action é de escrita) qualquer POST com o header
 * `next-action` é ABORTADO e registrado; no CRM é só registrado.
 */

export const ESTADO_ADMIN = ".auth/admin.json";
export const MOTIVO_SEM_QA = "sem usuário de QA (.env.e2e.local)";

export type AcaoServidor = { url: string; bloqueada: boolean };

export const test = base.extend<{ acoesServidor: AcaoServidor[] }>({
  acoesServidor: [
    async ({ page }, use, testInfo) => {
      if (!process.env.E2E_EMAIL || !process.env.E2E_SENHA) {
        testInfo.skip(true, MOTIVO_SEM_QA);
      }
      const registradas: AcaoServidor[] = [];
      await page.route(
        (url) => url.pathname.startsWith("/admin"),
        async (route) => {
          const req = route.request();
          if (req.method() === "POST" && "next-action" in req.headers()) {
            const caminho = new URL(page.url()).pathname;
            const bloqueada = /^\/admin\/(posts|imoveis|parametros)/.test(caminho);
            registradas.push({ url: req.url(), bloqueada });
            if (bloqueada) {
              await route.abort("blockedbyclient");
              return;
            }
          }
          await route.continue();
        },
      );
      await use(registradas);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Clica em "Editar lead" até o modal abrir: antes da hidratação o clique se perde.
 * Só clica de novo se o modal NÃO está aberto (com ele aberto o overlay interceptaria).
 */
export async function abrirModalDoLead(page: Page, editar: Locator): Promise<Locator> {
  const modal = page.getByRole("dialog", { name: /^Lead / });
  await expect(async () => {
    if (!(await modal.isVisible())) await editar.click();
    await expect(modal).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  return modal;
}

/**
 * Abre uma rota de admin. Pula o teste (com motivo) se a sessão não vale ou se
 * o usuário de QA não é admin — em vez de reprovar por problema de ambiente.
 */
export async function abrirAdmin(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  const atual = new URL(page.url()).pathname;
  if (atual.startsWith("/admin/login")) {
    test.skip(true, "sessão do usuário de QA não autenticou (credenciais inválidas?)");
  }
  const alvo = caminho.split("?")[0].replace(/\/$/, "");
  if (!atual.startsWith(alvo)) {
    test.skip(true, `usuário de QA sem acesso a ${alvo} (não é admin?) — redirecionado para ${atual}`);
  }
}
