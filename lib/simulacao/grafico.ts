import { brl } from "./formato";
import type { BancoView, LegendaView } from "./tipos";

/** Estilos por posição na ordem de CET: [cor, espessura, tracejado]. */
const ESTILOS: ReadonlyArray<readonly [string, number, string]> = [
  ["#1F6B4E", 2.4, ""],
  ["#8A6C48", 1.4, ""],
  ["#A99E87", 1.3, ""],
  ["#5c5f59", 1.2, ""],
  ["#5c5f59", 1.2, "4 3"],
  ["#C9BFAC", 1.2, ""],
  ["#C9BFAC", 1.2, "4 3"],
];

const estilo = (i: number) => ESTILOS[Math.min(i, ESTILOS.length - 1)];
const f1 = (n: number) => n.toFixed(1);

/**
 * Gráfico de linhas da parcela mensal (porta de `grafico()`). `bancos` já vem
 * ordenado por CET: o primeiro é o destaque e é desenhado por cima. O SVG só
 * leva números e cores fixas, nunca texto do visitante.
 */
export function grafico(
  bancos: BancoView[],
  meses: number[],
  w = 540,
  h = 128,
): { svg: string; legenda: LegendaView[] } {
  const pl = 40;
  const pr = 8;
  const pt = 8;
  const pb = 22;
  const iw = w - pl - pr;
  const ih = h - pt - pb;
  const mmax = Math.max(...bancos.map((b) => b.prazo));
  const vmax = Math.max(...bancos.map((b) => b.primeira));
  const vtop = Math.ceil(vmax / 1000) * 1000 || 1000;
  const passo = vtop <= 6000 ? 1000 : 2000;
  const X = (m: number) => pl + ((m - 1) / Math.max(mmax - 1, 1)) * iw;
  const Y = (v: number) => pt + ih - (v / vtop) * ih;

  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg">`;
  for (let v = 0; v <= vtop; v += passo) {
    s += `<line x1="${pl}" x2="${pl + iw}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" stroke="rgba(23,26,23,.1)" stroke-width=".8"/>`;
    s += `<text x="${pl - 6}" y="${f1(Y(v) + 3)}" font-size="7.5" font-family="Plex" fill="#5c5f59" text-anchor="end">${brl(v, 0)}</text>`;
  }
  const tick = mmax > 240 ? 60 : 24;
  const marcas = [1];
  for (let m = tick; m <= mmax; m += tick) marcas.push(m);
  for (const m of marcas) {
    s += `<text x="${f1(X(m))}" y="${h - 6}" font-size="7.5" font-family="Plex" fill="#5c5f59" text-anchor="middle">${m === 1 ? "mês 1" : m}</text>`;
  }

  const legenda: LegendaView[] = bancos.map((b, i) => {
    const [cor, sw, da] = estilo(i);
    return { nome: b.nome, cor, w: Math.max(sw, 1.6), estilo: da ? "dashed" : "solid" };
  });

  for (let i = bancos.length - 1; i >= 0; i--) {
    const b = bancos[i];
    const [cor, sw, da] = estilo(i);
    const pts: string[] = [];
    meses.forEach((m, k) => {
      const v = b.parcelas[k];
      if (v !== null && v !== undefined) pts.push(`${f1(X(m))},${f1(Y(v))}`);
    });
    if (pts.length === 0) continue;
    s += `<path d="M${pts.join(" L")}" fill="none" stroke="${cor}" stroke-width="${sw}" stroke-dasharray="${da}" stroke-linejoin="round"/>`;
  }
  return { svg: `${s}</svg>`, legenda };
}
