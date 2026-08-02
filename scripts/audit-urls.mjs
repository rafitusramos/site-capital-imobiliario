#!/usr/bin/env node
/* Auditoria comparativa de metadados entre produção e preview, para o
 * checkpoint da Etapa 6 da migração (crawl comparativo antes do cutover).
 *
 * Uso: node scripts/audit-urls.mjs <base-producao> <base-preview>
 */

const URLS_CONHECIDAS = [
  "/",
  "/financiamento/",
  "/home_equity/",
  "/sobre.html",
  "/blog/",
  "/blog/home-equity-empresario-capital-de-giro/",
  "/blog/home-equity-o-que-e-como-funciona/",
  "/blog/melhor-taxa-financiamento-imobiliario-bancos/",
];

const VERMELHO = "\x1b[31m";
const RESET = "\x1b[0m";
const CINZA = "\x1b[90m";

function limparBarraFinal(url) {
  return url.replace(/\/+$/, "");
}

function extrairTitulo(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extrairAtributoDaTag(tags, atributoFiltro, valorFiltro, atributoAlvo) {
  for (const tag of tags) {
    const filtro = tag.match(new RegExp(`${atributoFiltro}=["']([^"']*)["']`, "i"));
    if (filtro && filtro[1].toLowerCase() === valorFiltro) {
      const alvo = tag.match(new RegExp(`${atributoAlvo}=["']([^"']*)["']`, "i"));
      return alvo ? alvo[1].trim() : null;
    }
  }
  return null;
}

function extrairMetaDescricao(html) {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  return extrairAtributoDaTag(metas, "name", "description", "content");
}

function extrairCanonical(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  return extrairAtributoDaTag(links, "rel", "canonical", "href");
}

async function buscarPagina(baseUrl, caminho) {
  const url = `${limparBarraFinal(baseUrl)}${caminho}`;
  try {
    const resposta = await fetch(url, { redirect: "follow" });
    const html = await resposta.text();
    return {
      url,
      status: resposta.status,
      title: extrairTitulo(html),
      description: extrairMetaDescricao(html),
      canonical: extrairCanonical(html),
      erro: null,
    };
  } catch (erro) {
    return {
      url,
      status: null,
      title: null,
      description: null,
      canonical: null,
      erro: erro.message,
    };
  }
}

function truncar(valor, tamanho) {
  if (valor === null || valor === undefined) return CINZA + "—" + RESET;
  const texto = String(valor);
  return texto.length > tamanho ? texto.slice(0, tamanho - 1) + "…" : texto;
}

function pad(texto, largura) {
  const semCor = texto.replace(/\x1b\[[0-9;]*m/g, "");
  const espacos = Math.max(0, largura - semCor.length);
  return texto + " ".repeat(espacos);
}

function linhaDivergente(valorA, valorB) {
  return String(valorA) !== String(valorB);
}

function formatarCelula(valor, tamanho, divergente) {
  const bruto = truncar(valor, tamanho);
  return divergente ? `${VERMELHO}${bruto}${RESET}` : bruto;
}

async function main() {
  const [baseProducao, basePreview] = process.argv.slice(2);
  if (!baseProducao || !basePreview) {
    console.error(
      "Uso: node scripts/audit-urls.mjs <base-producao> <base-preview>"
    );
    process.exitCode = 1;
    return;
  }

  const LARG_URL = 46;
  const LARG_CAMPO = 12;
  const LARG_VALOR = 42;

  const cabecalho = `${pad("URL", LARG_URL)} ${pad("Campo", LARG_CAMPO)} ${pad(
    "Produção",
    LARG_VALOR
  )} ${pad("Preview", LARG_VALOR)}`;
  console.log(cabecalho);
  console.log("-".repeat(cabecalho.length));

  let totalDivergencias = 0;

  for (const caminho of URLS_CONHECIDAS) {
    const [prod, preview] = await Promise.all([
      buscarPagina(baseProducao, caminho),
      buscarPagina(basePreview, caminho),
    ]);

    const campos = [
      ["status", prod.erro ?? prod.status, preview.erro ?? preview.status],
      ["title", prod.title, preview.title],
      ["description", prod.description, preview.description],
      ["canonical", prod.canonical, preview.canonical],
    ];

    campos.forEach(([campo, valorProd, valorPreview], i) => {
      const divergente = linhaDivergente(valorProd, valorPreview);
      if (divergente) totalDivergencias += 1;
      const colUrl = i === 0 ? caminho : "";
      const linha = `${pad(colUrl, LARG_URL)} ${pad(campo, LARG_CAMPO)} ${pad(
        formatarCelula(valorProd, LARG_VALOR, divergente),
        LARG_VALOR
      )} ${pad(formatarCelula(valorPreview, LARG_VALOR, divergente), LARG_VALOR)}`;
      console.log(linha);
    });
    console.log("-".repeat(cabecalho.length));
  }

  console.log(
    totalDivergencias === 0
      ? "Nenhuma divergência encontrada."
      : `${VERMELHO}${totalDivergencias} divergência(s) encontrada(s).${RESET}`
  );

  process.exitCode = totalDivergencias === 0 ? 0 : 1;
}

main();
