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

/*
 * PR #95: campo de palavras-chave em chips. Só digita no formulário de nova
 * automação e sai sem salvar: nenhuma Server Action pode ser disparada.
 */
test.describe("Instagram DM: palavras-chave em chips (nova automação, sem salvar)", () => {
  test.use({ storageState: ESTADO_ADMIN });

  const NOVA = "/admin/instagram/automacoes/nova/";

  async function abrirCampo(page: import("@playwright/test").Page) {
    await abrirAdmin(page, NOVA);
    const entrada = page.getByRole("combobox", { name: "Palavras-chave" });
    await expect(entrada).toBeVisible();
    const chips = page.getByRole("list", { name: "Palavras-chave adicionadas" }).getByRole("listitem");
    return { entrada, chips };
  }

  async function sairSemSalvar(page: import("@playwright/test").Page) {
    page.once("dialog", (d) => d.accept());
    await page.goto("/admin/instagram/automacoes/").catch(() => undefined);
  }

  test("vírgula cria chip e esvazia o campo; texto de ajuda visível", async ({ page, acoesServidor }) => {
    const { entrada, chips } = await abrirCampo(page);
    await expect(page.getByText("Digite e tecle Enter ou vírgula para adicionar. Maiúsculas e acentos são ignorados.")).toBeVisible();
    await entrada.fill("abc,");
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText("abc");
    await expect(entrada).toHaveValue("");
    expect(acoesServidor).toEqual([]);
    await sairSemSalvar(page);
  });

  test("Enter cria chip e NÃO envia o formulário nem navega", async ({ page, acoesServidor }) => {
    const { entrada, chips } = await abrirCampo(page);
    const antes = page.url();
    await entrada.fill("Def");
    await entrada.press("Enter");
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText(/def/i);
    expect(page.url()).toBe(antes);
    await expect(page.getByRole("heading", { name: "Nova automação" })).toBeVisible();
    expect(acoesServidor, "Enter não pode disparar Server Action").toEqual([]);
    await sairSemSalvar(page);
  });

  test("duplicata ignorando maiúsculas e acentos não cria segundo chip", async ({ page }) => {
    const { entrada, chips } = await abrirCampo(page);
    await entrada.fill("abc,");
    await expect(chips).toHaveCount(1);
    await entrada.fill("ABC,");
    await entrada.fill("ábc,");
    await expect(chips).toHaveCount(1);
    await sairSemSalvar(page);
  });

  test("Backspace no campo vazio remove o último chip", async ({ page }) => {
    const { entrada, chips } = await abrirCampo(page);
    await entrada.fill("um,");
    await entrada.fill("dois,");
    await expect(chips).toHaveCount(2);
    await entrada.press("Backspace");
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText("um");
    await sairSemSalvar(page);
  });

  test("botão 'Remover palavra' remove o chip", async ({ page }) => {
    const { entrada, chips } = await abrirCampo(page);
    await entrada.fill("um,");
    await entrada.fill("dois,");
    await expect(chips).toHaveCount(2);
    await page.getByRole("button", { name: "Remover palavra um" }).click();
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText("dois");
    await sairSemSalvar(page);
  });

  test("colar 'x, y, z' cria 3 chips", async ({ page }) => {
    const { entrada, chips } = await abrirCampo(page);
    await entrada.focus();
    await entrada.evaluate((el) => {
      const dt = new DataTransfer();
      dt.setData("text", "x, y, z");
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(chips).toHaveCount(3);
    await expect(chips.nth(0)).toContainText("x");
    await expect(chips.nth(1)).toContainText("y");
    await expect(chips.nth(2)).toContainText("z");
    await sairSemSalvar(page);
  });

  test("blur com texto pendente confirma o chip", async ({ page }) => {
    const { entrada, chips } = await abrirCampo(page);
    await entrada.fill("pendente");
    await page.getByRole("heading", { name: "Nova automação" }).click();
    await entrada.blur();
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText("pendente");
    await sairSemSalvar(page);
  });

  test("sugestões de palavras já usadas: listbox, ArrowDown+Enter e Escape", async ({ page, acoesServidor }) => {
    await abrirAdmin(page, "/admin/instagram/automacoes/");
    const corpo = await page.locator("main").innerText();
    const m = /Palavras?:\s*([^\n]+)/i.exec(corpo);
    const existentes = (m?.[1] ?? "").split(",").map((s) => s.trim()).filter((s) => s.length >= 2);
    test.skip(existentes.length === 0, "nenhuma automação com palavras-chave cadastrada: não há o que sugerir");
    const palavra = existentes[0];

    const { entrada, chips } = await abrirCampo(page);
    const lista = page.getByRole("listbox", { name: "Palavras já usadas" });
    await entrada.fill(palavra.slice(0, 2));
    await expect(lista).toBeVisible();
    await expect(entrada).toHaveAttribute("aria-expanded", "true");
    await expect(lista.getByRole("option", { name: new RegExp(palavra, "i") }).first()).toBeVisible();

    await entrada.press("ArrowDown");
    await entrada.press("Enter");
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText(new RegExp(palavra, "i"));

    await entrada.fill(palavra.slice(0, 2));
    // a palavra já escolhida não é sugerida de novo; se houver outra, Escape fecha
    if (await lista.isVisible()) {
      await entrada.press("Escape");
      await expect(lista).toBeHidden();
      await expect(entrada).toHaveAttribute("aria-expanded", "false");
    }
    expect(acoesServidor).toEqual([]);
    await sairSemSalvar(page);
  });

  for (const [rotulo, largura] of [["desktop", 1280], ["390px", 390]] as const) {
  test(`layout ${rotulo}: chips quebram linha dentro da caixa e sem rolagem horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    const { entrada } = await abrirCampo(page);
    for (const p of ["financiamento", "home equity", "consorcio", "imoveis", "palavra-longa-de-teste", "quero"]) {
      await entrada.fill(`${p},`);
    }
    const caixa = entrada.locator("xpath=ancestor::div[contains(@class,'flex-wrap')][1]");
    await caixa.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/palavras-chips-${rotulo}.png` });
    const medidas = await page.evaluate(() => ({
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(medidas.docOverflow, "overflow horizontal da página").toBeLessThanOrEqual(0);
    const cx = await caixa.boundingBox();
    const itens = await page.getByRole("list", { name: "Palavras-chave adicionadas" }).getByRole("listitem").all();
    for (const li of itens) {
      const b = await li.boundingBox();
      expect(b!.x + b!.width).toBeLessThanOrEqual(cx!.x + cx!.width + 1);
    }
    await sairSemSalvar(page);
  });
  }
});
