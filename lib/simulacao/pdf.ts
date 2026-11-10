import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { FONTES_SIMULACAO } from "./fontes-asset";
import { gerarHtmlSimulacao } from "./html";
import type { SimulacaoView } from "./tipos";

/**
 * HTML -> PDF A4 num Chromium headless (puppeteer-core + @sparticuz/chromium,
 * validado na Vercel Hobby). Regras:
 * - rede bloqueada: só `data:` passa (fontes e logos vêm embutidos), então um
 *   dado malicioso no HTML não consegue fazer o navegador buscar nada;
 * - o navegador SEMPRE fecha (`finally`);
 * - exceção é registrada antes de virar mensagem amigável.
 *
 * Fora da Vercel (desenvolvimento), defina SIMULACAO_CHROME_PATH com o caminho
 * de um Chrome/Chromium local.
 */
export async function gerarPdfSimulacao(vm: SimulacaoView): Promise<Buffer> {
  const html = gerarHtmlSimulacao(vm, FONTES_SIMULACAO);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    const local = process.env.SIMULACAO_CHROME_PATH;
    const executablePath = local ?? (await chromium.executablePath());
    const args = local ? ["--no-sandbox"] : await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" });
    browser = await puppeteer.launch({ args, executablePath, headless: "shell" });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith("data:")) void req.continue();
      else void req.abort();
    });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    return Buffer.from(pdf);
  } catch (e) {
    console.error("[simulacao] falha ao gerar o PDF:", e);
    throw new Error("Falha ao gerar o PDF.");
  } finally {
    try {
      await browser?.close();
    } catch (e) {
      console.error("[simulacao] falha ao fechar o navegador:", e);
    }
  }
}
