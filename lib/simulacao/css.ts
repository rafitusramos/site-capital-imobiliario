// Folha de estilo do documento (porta do template.html do pacote rt-simulacao,
// com Archivo no lugar de Inter e colunas apertadas para 7 bancos). As @font-face
// são montadas em html.ts, com as fontes em base64.
export const CSS_SIMULACAO = `
@page { size:A4; margin:0; }
:root { --abissal:#0A241C; --marfim:#F2EFE7; --branco:#FCFAF4; --tinta:#171A17; --jade:#1F6B4E; --bronze:#8A6C48; --areia:#C9BFAC; --verde:#DCE7DD; }
* { box-sizing:border-box; margin:0; padding:0; }
html,body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Archivo',sans-serif; color:var(--tinta); font-size:9pt; line-height:1.45; background:#d9d4c8; }
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
.bl { display:block; height:15px; width:auto; margin:0 0 3px auto; }
.flag { display:block; font-size:6.4pt; font-weight:700; color:var(--jade); margin-bottom:1px; } .flag.ip { color:var(--bronze); }
.cmp th, .cmp td { padding:4px 5px; text-align:right; }
.cmp thead th { font-weight:600; font-size:8pt; color:var(--abissal); vertical-align:bottom; border-bottom:1.2px solid var(--abissal); padding-top:6px; }
.cmp td { font-family:'Plex'; font-size:7.6pt; border-bottom:1px solid rgba(201,191,172,.65); }
.cmp td:first-child, .cmp th:first-child { text-align:left; font-family:'Archivo'; font-size:7.8pt; color:#4b4f49; font-weight:400; }
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
.pick .b .s { font-size:6.6pt; opacity:.7; margin-top:.5mm; } .pick .b .s.g { color:#9cc9b3; opacity:1; }
.cmp thead th.best { color:var(--jade); } .cmp thead th.ip { color:#7d7f79; }
.evo th.best { color:var(--jade); } .evo th.ip { color:#7d7f79; }
.logo.sm .mark::after { width:6px; height:6px; right:-3.5px; bottom:-3.5px; }
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
