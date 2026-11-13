import { abrirAdmin, ESTADO_ADMIN, expect, test } from "./apoio/admin";
import { canonicalDaPagina, coletarErros } from "./apoio/pagina";

/*
 * SOMENTE LEITURA (PR #91, Instagram comentário -> DM). Todo deploy usa o MESMO
 * banco de produção e as variáveis META_* e CRON_SECRET existem só no ambiente
 * Production da Vercel. Logo, no preview o webhook e o disparador têm de recusar
 * com 503 e não fazer nada. Os POSTs abaixo são recusados pela trava 503.
 * Nada aqui salva, conecta conta, exclui dado ou envia o formulário de automação.
 */

test.describe("Instagram DM: rotas públicas (trava 503)", () => {
  test("GET /api/meta/webhook/ com hub.* responde 503 (não eco do challenge)", async ({ request }) => {
    const r = await request.get(
      "/api/meta/webhook/?hub.mode=subscribe&hub.verify_token=qualquer&hub.challenge=abc123",
    );
    expect(r.status()).toBe(503);
    expect(await r.text()).not.toContain("abc123");
  });

  test("POST /api/meta/webhook/ responde 503", async ({ request }) => {
    const r = await request.post("/api/meta/webhook/", {
      data: { object: "instagram", entry: [] },
      headers: { "x-hub-signature-256": "sha256=00" },
    });
    expect(r.status()).toBe(503);
  });

  test("POST /api/meta/disparar/ responde 503", async ({ request }) => {
    const r = await request.post("/api/meta/disparar/", { headers: { authorization: "Bearer x" } });
    expect(r.status()).toBe(503);
  });
});

test.describe("Instagram DM: link curto /ir/", () => {
  test("código inexistente redireciona ao site, sem 500, com noindex", async ({ request, baseURL }) => {
    const r = await request.get("/ir/codigo-que-nao-existe-qa/", { maxRedirects: 0 });
    expect(r.status(), "esperado 302").toBe(302);
    expect(r.headers()["x-robots-tag"]).toContain("noindex");
    expect(r.headers()["cache-control"]).toContain("no-store");
    const destino = r.headers()["location"] ?? "";
    expect(destino).toMatch(/^https?:\/\//);
    expect(new URL(destino).pathname === "/" || destino.includes(new URL(baseURL!).host) || destino.includes("rtcapitalimobiliario.com.br")).toBe(true);
  });

  test("/robots.txt bloqueia /ir/ e /admin", async ({ request }) => {
    const r = await request.get("/robots.txt");
    expect(r.status()).toBe(200);
    const txt = await r.text();
    expect(txt).toMatch(/Disallow: \/ir\//);
    expect(txt).toMatch(/Disallow: \/admin/);
  });
});

test.describe("Instagram DM: política de privacidade", () => {
  test("seção 13 'Conversas no Instagram' existe e a canonical segue intacta", async ({ page }) => {
    const r = await page.goto("/politica-de-privacidade/");
    expect(r?.status()).toBe(200);
    const secao = page.locator("#conversas-no-instagram");
    await expect(secao).toBeVisible();
    await expect(secao).toContainText("13.");
    await expect(secao).toContainText("Conversas no Instagram");
    await expect(secao).toContainText("comenta");
    expect(await canonicalDaPagina(page)).toMatch(/\/politica-de-privacidade\/$/);
  });
});

test.describe("Instagram DM: admin (degradado, sem migrations 035/036)", () => {
  test.use({ storageState: ESTADO_ADMIN });

  test("sidebar mostra a entrada Instagram", async ({ page }) => {
    await abrirAdmin(page, "/admin/instagram/");
    await expect(page.getByRole("link", { name: "Instagram", exact: true }).first()).toBeVisible();
  });

  for (const caminho of [
    "/admin/instagram/",
    "/admin/instagram/automacoes/",
    "/admin/instagram/automacoes/nova/",
    "/admin/instagram/conexao/",
  ]) {
    test(`${caminho} renderiza sem 500 e sem erro de console`, async ({ page, baseURL, acoesServidor }) => {
      const erros = coletarErros(page, baseURL!);
      const respostas: number[] = [];
      page.on("response", (res) => {
        if (new URL(res.url()).pathname.startsWith("/admin/instagram")) respostas.push(res.status());
      });
      await abrirAdmin(page, caminho);
      await expect(page.getByRole("main")).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(respostas.filter((s) => s >= 500), "respostas 5xx").toEqual([]);
      await expect(page.getByText(/Application error|Internal Server Error|Algo deu errado/i)).toHaveCount(0);
      console.log(`[estado] ${caminho} -> h1="${await page.locator("h1").first().textContent().catch(() => "")}"`);
      console.log(`[estado] ${caminho} corpo: ${(await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400)}`);
      expect(erros.proprios, "erros de console próprios").toEqual([]);
      expect(acoesServidor, "nenhuma Server Action disparada").toEqual([]);
    });
  }

  test("formulário Nova automação: contador de limite marca excesso, sem enviar", async ({ page, acoesServidor }) => {
    await abrirAdmin(page, "/admin/instagram/automacoes/nova/");
    await expect(page.getByRole("heading", { name: "Nova automação" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar automação" })).toBeVisible();
    // Primeiro textarea com contador /640 (mensagem com botão): estoura o limite só na tela.
    const contador = page.getByText(/^0\/640$/).first();
    await expect(contador).toBeVisible();
    // O contador fica no div irmão do textarea; sobe ao container do Campo.
    const areaComLimite = contador.locator("xpath=ancestor::div[2]").locator("textarea");
    await areaComLimite.fill("x".repeat(650));
    await expect(page.getByText("650/640").first()).toBeVisible();
    await expect(page.getByText("650/640").first()).toHaveClass(/erro/);
    // Descarta: não clica em salvar.
    expect(acoesServidor).toEqual([]);
  });
});
