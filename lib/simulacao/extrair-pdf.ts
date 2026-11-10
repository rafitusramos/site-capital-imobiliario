import { ErroExtracao, extrairDadosCreditas, type ColunaBanco, type Palavra } from "./extrair";
import { limitesDaTinta } from "./logo";
import type { DadosCreditas } from "./tipos";

/**
 * Leitura do PDF da Creditas NO NAVEGADOR (pdf.js). Este módulo só pode ser
 * importado por componente client, e o pdf.js entra por import dinâmico: o
 * bundle do admin não carrega a biblioteca até alguém anexar um PDF.
 *
 * O que vira dado é decidido por `extrairDadosCreditas` (puro e testado); aqui
 * ficam só a leitura das palavras com posição e o recorte dos logos por canvas.
 */

export const LIMITE_BYTES_PDF = 5 * 1024 * 1024;
const MAX_PAGINAS = 12;
/** Resolução do recorte dos logos (a mesma do pacote em Python). */
const DPI_LOGO = 600;
/** Do topo da letra à linha de base, para o nome do banco (fonte ~6pt). */
const TOPO_ACIMA_DA_BASE = 4.5;

type Pdfjs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

async function carregarPdfjs(): Promise<Pdfjs> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  return pdfjs;
}

type Pagina = Awaited<ReturnType<Awaited<ReturnType<Pdfjs["getDocument"]>["promise"]>["getPage"]>>;

async function palavrasDaPagina(pagina: Pagina): Promise<Palavra[]> {
  const vp = pagina.getViewport({ scale: 1 });
  const conteudo = await pagina.getTextContent();
  const palavras: Palavra[] = [];
  for (const item of conteudo.items) {
    if (!("str" in item) || item.str.trim() === "") continue;
    palavras.push({ texto: item.str, x: item.transform[4], y: vp.height - item.transform[5], largura: item.width });
  }
  return palavras;
}

/** Recorta o logo desenhado acima do nome de cada banco. Falha de um logo não derruba a leitura: o banco só fica sem logo. */
async function recortarLogos(pagina: Pagina, colunas: ColunaBanco[]): Promise<Map<string, string>> {
  const logos = new Map<string, string>();
  const k = DPI_LOGO / 72;
  const vp = pagina.getViewport({ scale: k });
  const larguraPt = vp.width / k;
  const topo = Math.min(...colunas.map((c) => c.y)) - TOPO_ACIMA_DA_BASE - 18;
  const base = Math.max(...colunas.map((c) => c.y)) - TOPO_ACIMA_DA_BASE - 1.5;
  const faixa = document.createElement("canvas");
  faixa.width = Math.ceil(larguraPt * k);
  faixa.height = Math.max(1, Math.ceil((base - topo) * k));
  const ctx = faixa.getContext("2d", { willReadFrequently: true });
  if (!ctx) return logos;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, faixa.width, faixa.height);
  await pagina.render({ canvasContext: ctx, viewport: vp, transform: [1, 0, 0, 1, 0, -topo * k], canvas: faixa }).promise;

  for (const c of colunas) {
    const cx = (c.x0 + c.x1) / 2;
    const sx = Math.max(0, Math.floor((cx - 18) * k));
    const sw = Math.min(faixa.width - sx, Math.ceil(36 * k));
    if (sw <= 0) continue;
    const recorte = ctx.getImageData(sx, 0, sw, faixa.height);
    const lim = limitesDaTinta(recorte.data, sw, faixa.height, Math.round(2 * k));
    if (!lim) continue;
    const saida = document.createElement("canvas");
    saida.width = lim.x1 - lim.x0;
    saida.height = lim.y1 - lim.y0;
    const sctx = saida.getContext("2d");
    if (!sctx) continue;
    sctx.putImageData(ctx.getImageData(sx + lim.x0, lim.y0, saida.width, saida.height), 0, 0);
    logos.set(c.nome, saida.toDataURL("image/png"));
  }
  return logos;
}

/**
 * Lê o PDF e devolve os dados da simulação (com logos). Lança `ErroExtracao`
 * com mensagem em português quando o arquivo não é uma simulação reconhecível.
 */
export async function lerPdfCreditas(arquivo: File): Promise<DadosCreditas> {
  if (arquivo.size > LIMITE_BYTES_PDF) {
    throw new ErroExtracao("O arquivo é grande demais (limite de 5 MB).");
  }
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  // "%PDF" nos primeiros bytes: recusa cedo o que não é PDF, antes de gastar o pdf.js.
  if (bytes.length < 5 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "%PDF") {
    throw new ErroExtracao("O arquivo não é um PDF.");
  }

  const pdfjs = await carregarPdfjs();
  let documento;
  try {
    documento = await pdfjs.getDocument({ data: bytes }).promise;
  } catch (e) {
    console.error("[simulacao] pdf.js não abriu o arquivo:", e);
    throw new ErroExtracao("Não foi possível abrir o PDF. Ele pode estar corrompido ou protegido por senha.");
  }
  try {
    if (documento.numPages > MAX_PAGINAS) {
      throw new ErroExtracao("O PDF tem páginas demais para ser uma simulação da Creditas.");
    }
    const paginas: Pagina[] = [];
    const palavras: Palavra[][] = [];
    for (let n = 1; n <= documento.numPages; n++) {
      const pagina = await documento.getPage(n);
      paginas.push(pagina);
      palavras.push(await palavrasDaPagina(pagina));
    }
    const { dados, colunas } = extrairDadosCreditas(palavras);
    try {
      const logos = await recortarLogos(paginas[0], colunas);
      for (const b of dados.bancos) b.logo = logos.get(b.nome) ?? null;
    } catch (e) {
      console.error("[simulacao] recorte dos logos falhou; segue sem logos:", e);
    }
    return dados;
  } finally {
    await documento.loadingTask.destroy();
  }
}
