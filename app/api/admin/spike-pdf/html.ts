// SPIKE: remover antes de qualquer PR. Dados 100% fictícios.
import { FONTES } from "./fontes";

const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

type Banco = { nome: string; cls: string; taxa: number; base: number; flag: string };
const BANCOS: Banco[] = [
  { nome: "Banco Alfa", cls: "best", taxa: 0.1, base: 5000, flag: "Menor CET" },
  { nome: "Banco Beta", cls: "", taxa: 0.105, base: 5200, flag: "" },
  { nome: "Banco Gama", cls: "", taxa: 0.11, base: 5400, flag: "" },
  { nome: "Banco Delta", cls: "", taxa: 0.1125, base: 5500, flag: "" },
  { nome: "Banco Épsilon", cls: "", taxa: 0.115, base: 5600, flag: "" },
  { nome: "Banco Zeta", cls: "", taxa: 0.1175, base: 5700, flag: "" },
  { nome: "Banco Ômega", cls: "ip", taxa: 0.09, base: 4700, flag: "IPCA · fora do comparativo" },
];

const face = (fam: string, k: string, w: string) =>
  `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${FONTES[k]}) format('woff2');font-weight:${w};}`;

const CSS = `
${face("Caslon", "caslon", "400 700")}
${face("Plex", "plex", "400")}
${face("Plex", "plex500", "500")}
${face("InterRT", "archivo", "100 900")}
@page { size:A4; margin:0; }
:root { --abissal:#0A241C; --marfim:#F2EFE7; --branco:#FCFAF4; --tinta:#171A17; --jade:#1F6B4E; --bronze:#8A6C48; --areia:#C9BFAC; --verde:#DCE7DD; }
* { box-sizing:border-box; margin:0; padding:0; }
html,body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'InterRT',sans-serif; color:var(--tinta); font-size:9pt; line-height:1.45; background:#d9d4c8; }
table { border-collapse:collapse; width:100%; }
.page { width:210mm; height:297mm; background:var(--marfim); display:flex; flex-direction:column; overflow:hidden; page-break-after:always; margin:0 auto; }
.page:last-child { page-break-after:auto; }
.hd { background:var(--abissal); color:var(--marfim); padding:3.5mm 14mm; gap:8mm; display:flex; justify-content:space-between; align-items:center; }
.logo { display:flex; align-items:center; gap:10px; }
.logo .mark { position:relative; width:30px; height:30px; border:1.4px solid currentColor; display:flex; align-items:center; justify-content:center; font-family:'Caslon'; font-size:12.5px; }
.logo .mark::after { content:''; position:absolute; right:-4px; bottom:-4px; width:7px; height:7px; background:var(--bronze); }
.logo .nm { font-weight:600; font-size:12px; line-height:1.1; }
.logo .sub { white-space:nowrap; font-family:'Plex'; font-size:6.2px; letter-spacing:2.6px; margin-top:2px; }
.hd .tt { text-align:right; }
.hd .tt .h { font-family:'Caslon'; font-size:14pt; line-height:1.15; }
.hd .tt .r { font-family:'Plex'; font-size:6.8pt; opacity:.65; margin-top:1px; }
.ft { margin:0 14mm; padding:3mm 0 6mm; border-top:1px solid var(--areia); display:flex; align-items:center; justify-content:space-between; gap:4mm; color:var(--abissal); }
.ft .ct { font-family:'Plex'; font-size:6pt; display:flex; gap:3.5mm; white-space:nowrap; }
.ft .pg { font-family:'Plex'; font-size:6pt; color:#5c5f59; white-space:nowrap; }
.logo.sm { gap:8px; } .logo.sm .mark { width:24px; height:24px; font-size:10px; } .logo.sm .nm { font-size:9.5px; } .logo.sm .sub { font-size:5.2px; letter-spacing:2px; }
.body { padding:5mm 14mm 0; flex:1; display:flex; flex-direction:column; }
h1 { font-family:'Caslon'; font-weight:400; font-size:16pt; color:var(--abissal); line-height:1.1; }
.kpis { display:grid; grid-template-columns:repeat(4,1fr); margin:4mm 0 5mm; border-top:1.2px solid var(--abissal); border-bottom:1px solid var(--areia); }
.kpis > div { padding:2.2mm 0 2.2mm 4mm; } .kpis > div:first-child { padding-left:0; } .kpis > div + div { border-left:1px solid var(--areia); }
.kpis .l { font-size:6.8pt; color:#5c5f59; } .kpis .v { font-family:'Plex'; font-size:10.5pt; color:var(--abissal); }
.flag { display:block; font-size:6.4pt; font-weight:700; color:var(--jade); margin-bottom:1px; } .flag.ip { color:var(--bronze); }
.cmp th, .cmp td { padding:4px 5px; text-align:right; }
.cmp thead th { font-weight:600; font-size:8pt; color:var(--abissal); vertical-align:bottom; border-bottom:1.2px solid var(--abissal); padding-top:6px; }
.cmp td { font-family:'Plex'; font-size:7.6pt; border-bottom:1px solid rgba(201,191,172,.65); }
.cmp td:first-child, .cmp th:first-child { text-align:left; font-family:'InterRT'; font-size:7.8pt; color:#4b4f49; font-weight:400; }
.cmp .best { background:var(--verde); color:var(--jade); } .cmp tr.k td.best { font-weight:500; }
.cmp .ip { color:#7d7f79; border-left:1.2px dashed var(--areia); }
.pick { margin-top:4mm; display:grid; grid-template-columns:54mm 1fr; background:var(--abissal); color:var(--marfim); }
.pick .a { padding:4mm 5mm; border-right:1px solid rgba(242,239,231,.18); }
.pick .a .k { font-size:7pt; color:#9cc9b3; font-weight:600; }
.pick .a .n { font-family:'Caslon'; font-size:14pt; line-height:1.1; margin:1.5mm 0 2mm; }
.pick .a p { font-size:7.6pt; opacity:.85; }
.pick .b { display:grid; grid-template-columns:repeat(3,1fr); }
.pick .b > div { padding:3.4mm 4mm; border-bottom:1px solid rgba(242,239,231,.12); }
.pick .b > div:nth-child(n+4) { border-bottom:0; } .pick .b > div:not(:nth-child(3n+1)) { border-left:1px solid rgba(242,239,231,.12); }
.pick .b .l { font-size:6.8pt; opacity:.6; } .pick .b .v { font-family:'Plex'; font-size:10pt; } .pick .b .v.g { color:#9cc9b3; }
.chart { margin-top:4mm; }
.chart .t { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:1.5mm; }
.chart h2, .steps h2 { font-family:'Caslon'; font-weight:400; font-size:11pt; color:var(--abissal); }
.lg { display:flex; gap:4mm; font-size:7pt; color:#4b4f49; }
.lg i { display:inline-block; width:14px; height:0; vertical-align:middle; margin-right:4px; }
.steps { margin-top:4mm; } .steps h2 { margin-bottom:2.5mm; }
.steps ol { list-style:none; display:grid; grid-auto-flow:column; grid-auto-columns:1fr; }
.steps li { position:relative; padding:0 2.5mm 0 0; }
.steps .bar { height:3px; background:var(--areia); margin-bottom:2.5mm; position:relative; }
.steps li.done .bar, .steps li.now .bar { background:var(--jade); }
.steps .dot { position:absolute; left:0; top:-4px; width:11px; height:11px; border-radius:50%; background:var(--marfim); border:2px solid var(--areia); }
.steps li.now .dot, .steps li.done .dot { background:var(--jade); border-color:var(--jade); }
.steps .n { font-family:'Plex'; font-size:6.8pt; color:#7d7f79; } .steps li.now .n { color:var(--jade); font-weight:500; }
.steps .t { font-weight:600; font-size:8pt; color:var(--abissal); margin:.5mm 0 .8mm; } .steps .d { font-size:6.9pt; color:#4b4f49; line-height:1.4; }
.disc { margin-top:auto; padding:4mm 0 3mm; font-size:6.6pt; color:#5c5f59; line-height:1.5; list-style:disc; } .disc li { margin-left:11px; margin-bottom:1.5px; }
h2.p { font-family:'Caslon'; font-weight:400; font-size:12.5pt; color:var(--abissal); margin:1mm 0 4mm; }
.evo th { font-weight:600; font-size:7.2pt; text-align:right; padding:5px 5px; color:var(--abissal); border-bottom:1.2px solid var(--abissal); vertical-align:bottom; }
.evo td { font-family:'Plex'; font-size:7.4pt; text-align:right; padding:2.7px 5px; }
.evo .m { text-align:left; }
.evo tbody tr:nth-child(even) td { background:rgba(201,191,172,.2); }
.evo .best, .evo tbody tr:nth-child(even) td.best { background:var(--verde); color:var(--jade); }
.evo .ip { color:#7d7f79; border-left:1.2px dashed var(--areia); }
.evo tr.tot td { border-top:1.2px solid var(--abissal); font-weight:500; padding-top:6px; }
`;

const cab = `<header class="hd"><div class="logo"><div class="mark">RT</div><div><div class="nm">Rafael Teixeira</div><div class="sub">CAPITAL IMOBILIÁRIO</div></div></div><div class="tt"><div class="h">Simulação de financiamento</div><div class="r">Ref. 0001 · 09/11/2026</div></div></header>`;
const rod = (p: number) =>
  `<footer class="ft"><div class="logo sm"><div class="mark">RT</div><div><div class="nm">Rafael Teixeira</div><div class="sub">CAPITAL IMOBILIÁRIO</div></div></div><div class="ct"><div>contato@exemplo.com.br</div><div>(19) 90000-0000</div><div>exemplo.com.br</div></div><div class="pg">Página ${p} de 2</div></footer>`;

function parcela(b: Banco, mes: number) {
  return b.base * (1 - (mes - 1) * 0.0021) + (b.taxa - 0.1) * 1000;
}

function grafico(): string {
  const W = 700;
  const H = 150;
  const L = 36;
  const B = 18;
  const meses = 360;
  const cores = ["#1F6B4E", "#8A6C48", "#0A241C", "#9a9a90", "#C9BFAC", "#4b6b5e", "#7d7f79"];
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block">`;
  for (let i = 0; i <= 4; i++) {
    const y = 8 + ((H - B - 8) * i) / 4;
    const v = 5800 - i * 1200;
    g += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#C9BFAC" stroke-width=".6"/><text x="${L - 4}" y="${y + 3}" font-family="Plex" font-size="8" text-anchor="end" fill="#5c5f59">${brl0(v)}</text>`;
  }
  BANCOS.forEach((b, k) => {
    const pts: string[] = [];
    for (let m = 1; m <= meses; m += 12) {
      const x = L + ((W - L - 6) * (m - 1)) / (meses - 1);
      const y = 8 + ((H - B - 8) * (5800 - parcela(b, m))) / 4800;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    g += `<polyline fill="none" stroke="${cores[k]}" stroke-width="${k === 0 ? 1.8 : 1.1}" ${b.cls === "ip" ? 'stroke-dasharray="4 3"' : ""} points="${pts.join(" ")}"/>`;
  });
  [1, 120, 240, 360].forEach((m) => {
    const x = L + ((W - L - 6) * (m - 1)) / (meses - 1);
    g += `<text x="${x}" y="${H - 4}" font-family="Plex" font-size="8" text-anchor="${m === 360 ? "end" : "middle"}" fill="#5c5f59">${m}º mês</text>`;
  });
  return g + "</svg>";
}

export function htmlDoSpike(): string {
  const th = BANCOS.map(
    (b) => `<th class="${b.cls}">${b.flag ? `<span class="flag${b.cls === "ip" ? " ip" : ""}">${b.flag}</span>` : ""}${b.nome}</th>`,
  ).join("");
  const linha = (rot: string, f: (b: Banco) => string, k = "") =>
    `<tr class="${k}"><td>${rot}</td>${BANCOS.map((b) => `<td class="${b.cls}">${f(b)}</td>`).join("")}</tr>`;
  const cmp = [
    linha("Sistema", () => "SAC"),
    linha("Indexador", (b) => (b.cls === "ip" ? "IPCA" : "TR")),
    linha("Prazo (meses)", () => "360"),
    linha("Taxa de juros a.a.", (b) => (b.taxa * 100).toFixed(2).replace(".", ",") + "%"),
    linha("CET a.a.", (b) => ((b.taxa + 0.012) * 100).toFixed(2).replace(".", ",") + "%", "k"),
    linha("1ª parcela (R$)", (b) => brl(parcela(b, 1)), "k"),
    linha("Última parcela (R$)", (b) => brl(parcela(b, 360))),
    linha("Custo total (R$)", (b) => brl(parcela(b, 1) * 360 * 0.62), "k"),
  ].join("");
  const evo = Array.from({ length: 38 }, (_, i) => {
    const m = 1 + i * 9;
    return `<tr><td class="m">${String(m).padStart(3, "0")}</td>${BANCOS.map((b) => `<td class="${b.cls}">${brl(parcela(b, m))}</td>`).join("")}</tr>`;
  }).join("");
  const tot = BANCOS.map((b) => `<td class="${b.cls}">${brl(parcela(b, 1) * 360 * 0.62)}</td>`).join("");
  const etapas = ["Simulação", "Documentação", "Análise de crédito", "Avaliação do imóvel", "Assinatura do contrato"]
    .map(
      (t, i) =>
        `<li class="${i < 1 ? "done" : i === 1 ? "now" : ""}"><div class="bar"><i class="dot"></i></div><div class="n">0${i + 1}${i === 1 ? " · Agora" : ""}</div><div class="t">${t}</div><div class="d">Descrição fictícia da etapa para teste de quebra de linha e acentuação: ação, concessão, avaliação.</div></li>`,
    )
    .join("");
  const lgCores = ["#1F6B4E", "#8A6C48", "#0A241C", "#9a9a90"];
  const lg = BANCOS.slice(0, 4)
    .map((b, k) => `<span><i style="border-top:${k === 0 ? 2 : 1}px solid ${lgCores[k]}"></i>${b.nome}</span>`)
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Spike PDF</title><style>${CSS}</style></head><body>
<section class="page">${cab}<div class="body">
<h1>Olá, Maria Exemplo — veja sua simulação</h1>
<div class="kpis"><div><div class="l">Valor do imóvel</div><div class="v">R$ ${brl0(500000)}</div></div><div><div class="l">Financiamento</div><div class="v">R$ ${brl0(400000)}</div></div><div><div class="l">Entrada (20%)</div><div class="v">R$ ${brl0(100000)}</div></div><div><div class="l">Renda média estimada</div><div class="v">R$ ${brl(18000)}</div></div></div>
<table class="cmp"><thead><tr><th></th>${th}</tr></thead><tbody>${cmp}</tbody></table>
<div class="pick"><div class="a"><div class="k">Melhor escolha · menor CET em TR</div><div class="n">Banco Alfa</div><p>Entre os bancos corrigidos pela TR, é o de menor custo efetivo para este financiamento.</p></div>
<div class="b"><div><div class="l">CET a.a.</div><div class="v g">11,20%</div></div><div><div class="l">Taxa de juros a.a.</div><div class="v">10,00%</div></div><div><div class="l">Prazo · sistema</div><div class="v">360 m · SAC</div></div><div><div class="l">1ª parcela</div><div class="v">R$ ${brl(5000)}</div></div><div><div class="l">Renda mínima esperada</div><div class="v">R$ ${brl(16667)}</div></div><div><div class="l">Custo total do contrato</div><div class="v">R$ ${brl(1116000)}</div></div></div></div>
<div class="chart"><div class="t"><h2>Evolução da parcela mensal (R$)</h2><div class="lg">${lg}</div></div>${grafico()}</div>
<div class="steps"><h2>Etapas do financiamento</h2><ol>${etapas}</ol></div>
<ul class="disc"><li>Simulação ilustrativa, sem valor de proposta. Taxas, parcelas e seguros podem mudar após a análise de crédito e de capacidade de pagamento.</li><li>Dados fictícios para teste de viabilidade: ç ã õ é ê â ô ü — “aspas” e R$.</li></ul>
</div>${rod(1)}</section>
<section class="page">${cab}<div class="body"><h2 class="p">Evolução das parcelas (R$)</h2>
<table class="evo"><thead><tr><th class="m">Parcela</th>${th}</tr></thead><tbody>${evo}<tr class="tot"><td class="m">Total</td>${tot}</tr></tbody></table></div>${rod(2)}</section>
</body></html>`;
}
