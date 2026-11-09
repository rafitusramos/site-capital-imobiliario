// SPIKE: remover antes de qualquer PR.
// Teste de viabilidade: puppeteer-core + @sparticuz/chromium gerando PDF A4 na Vercel.
// Não toca no banco (exceto a leitura de perfil dentro de exigirAdmin), não envia e-mail.
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { exigirAdmin, ERRO_SESSAO_EXPIRADA } from "@/lib/admin/auth";
import { htmlDoSpike } from "./html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const t0 = Date.now();
  const { erro } = await exigirAdmin();
  if (erro) {
    return Response.json({ erro }, { status: erro === ERRO_SESSAO_EXPIRADA ? 401 : 403 });
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    const local = process.env.SPIKE_CHROME_PATH; // só para teste local fora da Vercel
    const executablePath = local ?? (await chromium.executablePath());
    const args = local ? ["--no-sandbox"] : await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" });
    browser = await puppeteer.launch({ args, executablePath, headless: "shell" });
    const tLaunch = Date.now();
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith("data:")) void req.continue();
      else void req.abort();
    });
    await page.setContent(htmlDoSpike(), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const tSet = Date.now();
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const tPdf = Date.now();
    const mem = process.memoryUsage();
    const tempos = `launch;dur=${tLaunch - t0}, setContent;dur=${tSet - tLaunch}, pdf;dur=${tPdf - tSet}, total;dur=${tPdf - t0}`;
    console.log("[spike-pdf]", tempos, `rss=${Math.round(mem.rss / 1048576)}MB`, `bytes=${pdf.length}`);
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Server-Timing": tempos, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[spike-pdf] falha:", e);
    return Response.json({ erro: "Falha ao gerar o PDF." }, { status: 500 });
  } finally {
    try {
      await browser?.close();
    } catch (e) {
      console.error("[spike-pdf] falha ao fechar o browser:", e);
    }
  }
}
