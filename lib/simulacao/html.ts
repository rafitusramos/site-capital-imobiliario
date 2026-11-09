import { escaparHtml } from "@/lib/email/templates/base";
import { CSS_SIMULACAO } from "./css";
import { brl, brl0, pct } from "./formato";
import type { BancoView, SimulacaoView } from "./tipos";

/** woff2 em base64, sem o prefixo `data:`. */
export interface FontesBase64 {
  caslon: string;
  archivo: string;
  plex: string;
  plex500: string;
}

const e = escaparHtml;
const LOGO_VALIDO = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

function face(familia: string, b64: string, peso: string): string {
  return `@font-face{font-family:'${familia}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${peso};}`;
}

const MARCA =
  '<div class="mark">RT</div><div><div class="nm">Rafael Teixeira</div><div class="sub">CAPITAL IMOBILI&#193;RIO</div></div>';

function cabecalho(vm: SimulacaoView): string {
  const ref = e(vm.referencia);
  const data = e(vm.data);
  const sep = vm.referencia && vm.data ? " · " : "";
  return `<header class="hd"><div class="logo">${MARCA}</div><div class="tt"><div class="h">${e(vm.titulo)}</div><div class="r">${ref}${sep}${data}</div></div></header>`;
}

function rodape(vm: SimulacaoView, p: number): string {
  const c = vm.contato;
  return `<footer class="ft"><div class="logo sm">${MARCA}</div><div class="ct"><div>${e(c.email)}</div><div>${e(c.telefone)}</div><div>${e(c.site)}</div></div><div class="pg">Página ${p} de 2</div></footer>`;
}

function cabecalhoBanco(b: BancoView): string {
  const marca = b.melhor
    ? '<span class="flag">Menor CET</span>'
    : !b.comparavel
      ? `<span class="flag ip">${e(b.indexador)} · fora do comparativo</span>`
      : "";
  const logo = b.logo && LOGO_VALIDO.test(b.logo) ? `<img class="bl" src="${b.logo}" alt="">` : "";
  return `<th class="${b.cls}">${marca}${logo}${e(b.nome)}</th>`;
}

export function gerarHtmlSimulacao(vm: SimulacaoView, fontes: FontesBase64): string {
  const bancos = vm.bancos;
  const th = bancos.map(cabecalhoBanco).join("");
  const linha = (rotulo: string, f: (b: BancoView) => string, k = "") =>
    `<tr${k ? ` class="${k}"` : ""}><td>${rotulo}</td>${bancos.map((b) => `<td class="${b.cls}">${f(b)}</td>`).join("")}</tr>`;

  const tabela = [
    linha("Sistema", (b) => e(b.sistema)),
    linha("Indexador", (b) => e(b.indexador)),
    linha("Prazo (meses)", (b) => String(b.prazo)),
    linha("Taxa de juros a.a.", (b) => pct(b.taxa)),
    linha("CET a.a.", (b) => `${pct(b.cet)}${b.ast}`, "k"),
    linha("1ª parcela (R$)", (b) => brl(b.primeira), "k"),
    linha("Última parcela (R$)", (b) => brl(b.ultima)),
    linha("Custo total (R$)", (b) => `${brl(b.custo_total)}${b.ast}`, "k"),
  ].join("");

  const m = vm.melhor;
  const legenda = vm.legenda
    .map((l) => `<span><i style="border-top:${l.w}px ${l.estilo} ${l.cor}"></i>${e(l.nome)}</span>`)
    .join("");
  const etapas = vm.etapas
    .map(
      (et) =>
        `<li class="${et.cls}"><div class="bar"><i class="dot"></i></div><div class="n">${et.i}${et.tag ? ` · ${et.tag}` : ""}</div><div class="t">${e(et.titulo)}</div><div class="d">${e(et.desc)}</div></li>`,
    )
    .join("");

  const avisoFora = vm.fora.length
    ? `<li>* ${e(vm.foraTxt)}: contrato corrigido por ${e(vm.foraIdx)}. Os valores exibidos não incluem essa correção, que é somada ao saldo devedor e às parcelas ao longo do contrato; por isso não entra no comparativo com os bancos em ${e(vm.comparaveisTxt)}.</li>`
    : "";
  const avisoSistemas = `<li>SAC: parcelas decrescentes e amortização constante.${vm.temPrice ? " Price: parcelas iguais e amortização crescente." : ""}${vm.rendaMedia ? ` Renda média estimada para comportar o financiamento: R$ ${brl(vm.rendaMedia)}, podendo variar conforme o banco e o perfil do cliente.` : ""}</li>`;

  const evolucao = vm.evolucao
    .map(
      (l) =>
        `<tr><td class="m">${String(l.mes).padStart(3, "0")}</td>${l.celulas.map((c) => `<td class="${c.cls}">${brl(c.valor)}</td>`).join("")}</tr>`,
    )
    .join("");
  const totais = bancos.map((b) => `<td class="${b.cls}">${brl(b.custo_total)}${b.ast}</td>`).join("");

  const fontFaces = [
    face("Caslon", fontes.caslon, "400 700"),
    face("Plex", fontes.plex, "400"),
    face("Plex", fontes.plex500, "500"),
    face("Archivo", fontes.archivo, "100 900"),
  ].join("\n");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${e(vm.titulo)} · ${e(vm.referencia)}</title><style>
${fontFaces}
${CSS_SIMULACAO}</style></head><body>
<section class="page">${cabecalho(vm)}<div class="body">
<h1>${e(vm.saudacao)}</h1>
<div class="kpis"><div><div class="l">Valor do imóvel</div><div class="v">R$ ${brl0(vm.valorImovel)}</div></div><div><div class="l">Financiamento</div><div class="v">R$ ${brl0(vm.valorFinanciamento)}</div></div><div><div class="l">Entrada (${vm.entradaPct}%)</div><div class="v">R$ ${brl0(vm.entrada)}</div></div><div><div class="l">Renda média estimada</div><div class="v">${vm.rendaMedia ? `R$ ${brl(vm.rendaMedia)}` : "—"}</div></div></div>
<table class="cmp"><thead><tr><th></th>${th}</tr></thead><tbody>${tabela}</tbody></table>
<div class="pick"><div class="a"><div class="k">Melhor escolha · menor CET em ${e(vm.comparaveisTxt)}</div><div class="n">${e(m.nome)}</div><p>Entre os bancos corrigidos pela ${e(vm.comparaveisTxt)}, é o de menor custo efetivo para este financiamento.</p></div>
<div class="b"><div><div class="l">CET a.a.</div><div class="v g">${pct(m.cet)}</div></div><div><div class="l">Taxa de juros a.a.</div><div class="v">${pct(m.taxa)}</div></div><div><div class="l">Prazo · sistema</div><div class="v">${m.prazo} m · ${e(m.sistema)}</div></div><div><div class="l">1ª parcela</div><div class="v">R$ ${brl(m.primeira)}</div></div><div><div class="l">Renda mínima esperada</div><div class="v">R$ ${brl(vm.rendaMinima)}</div><div class="s">parcela até ${vm.comprometimentoPct}% da renda bruta</div></div><div><div class="l">Custo total do contrato</div><div class="v">R$ ${brl(m.custo_total)}</div>${vm.economia > 0 ? `<div class="s g">R$ ${brl0(vm.economia)} a menos que ${e(vm.pior.nome)}</div>` : ""}</div></div></div>
<div class="chart"><div class="t"><h2>Evolução da parcela mensal (R$)</h2><div class="lg">${legenda}</div></div>${vm.graficoSvg}</div>
<div class="steps"><h2>Etapas do financiamento</h2><ol>${etapas}</ol></div>
<ul class="disc"><li>Simulação ilustrativa, sem valor de proposta. Taxas, parcelas e seguros podem mudar após a análise de crédito e de capacidade de pagamento feita por cada banco.</li>${avisoFora}${avisoSistemas}</ul>
</div>${rodape(vm, 1)}</section>
<section class="page">${cabecalho(vm)}<div class="body"><h2 class="p">Evolução das parcelas (R$)</h2>
<table class="evo"><thead><tr><th class="m">Parcela</th>${th}</tr></thead><tbody>${evolucao}<tr class="tot"><td class="m">Total</td>${totais}</tr></tbody></table>
${vm.fora.length ? `<ul class="disc"><li>* Valores de ${e(vm.foraTxt)} sem a correção por ${e(vm.foraIdx)}. Simulação ilustrativa, sem valor de proposta.</li></ul>` : ""}
</div>${rodape(vm, 2)}</section>
</body></html>`;
}
