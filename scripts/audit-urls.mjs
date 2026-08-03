#!/usr/bin/env node
/* Auditoria de SEO do site. Faz duas coisas independentes:
 *
 * 1. COMPARA metadados entre dois ambientes (title, description, canonical).
 *    Nasceu no checkpoint da Etapa 6 da migração, como crawl comparativo
 *    antes do cutover.
 * 2. ASSERTA o status HTTP das URLs que precisam responder 404.
 *
 * A segunda é asserção absoluta, não comparação, e é de propósito: uma
 * regressão que chegasse aos DOIS ambientes passaria como "nenhuma
 * divergência" na tabela comparativa.
 *
 * Uso: node scripts/audit-urls.mjs <base-producao> [base-preview]
 *      Sem a segunda base, roda só as asserções de status.
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

/* Cada entrada é [caminho, status esperado, o que quebra se falhar].
 *
 * O que estas linhas protegem: a documentação do Next avisa que o
 * `not-found` responde 404 em resposta NÃO-streamada, mas 200 em resposta
 * streamada. Hoje o status está certo, e é frágil — basta alguém pôr um
 * <Suspense> acima da busca do dado em app/(site)/blog/[slug] ou
 * app/(site)/imoveis/[slug] para o shell começar a ser enviado antes do
 * notFound(), o status virar 200 e o Google passar a indexar página de erro
 * como conteúdo real. Nada no build nem na suíte de testes acusa isso. */
const URLS_DE_STATUS = [
  ["/blog/este-artigo-nao-existe/", 404, "notFound() de app/(site)/blog/[slug]"],
  ["/imoveis/este-imovel-nao-existe/", 404, "notFound() de app/(site)/imoveis/[slug]"],
  ["/rota-que-nunca-existiu/", 404, "app/global-not-found.tsx"],
  // Âncora de sanidade: sem ela, um deploy quebrado que responde 404 em tudo
  // passaria com louvor nas três linhas acima.
  ["/", 200, "home — âncora de sanidade"],
];

const VERMELHO = "\x1b[31m";
const VERDE = "\x1b[32m";
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

/* `redirect: "manual"` para ler o status REAL de cada URL. Com "follow", um
 * 308 de normalização de barra final (next.config.ts usa trailingSlash) seria
 * seguido em silêncio e a asserção passaria a medir o destino, não a URL
 * pedida. Os caminhos abaixo já vão com a barra, então um 3xx aqui é sinal de
 * que algo mudou na normalização e merece falhar. */
async function verificarStatus(baseUrl, caminho) {
  const url = `${limparBarraFinal(baseUrl)}${caminho}`;
  try {
    const resposta = await fetch(url, { redirect: "manual" });
    return { url, status: resposta.status, erro: null };
  } catch (erro) {
    return { url, status: null, erro: erro.message };
  }
}

async function auditarStatus(baseUrl, rotulo) {
  console.log(`\nStatus HTTP — ${rotulo} (${limparBarraFinal(baseUrl)})`);
  console.log("-".repeat(78));

  let falhas = 0;

  for (const [caminho, esperado, oQueQuebra] of URLS_DE_STATUS) {
    const { status, erro } = await verificarStatus(baseUrl, caminho);
    const ok = status === esperado;
    if (!ok) falhas += 1;

    const marca = ok ? `${VERDE}ok${RESET}` : `${VERMELHO}FALHOU${RESET}`;
    const obtido = erro ?? status;
    console.log(
      `${pad(marca, 16)} ${pad(caminho, 40)} esperado ${esperado}, obtido ${obtido}`
    );

    if (!ok) {
      console.log(`${CINZA}   └─ protege: ${oQueQuebra}${RESET}`);
      if (status === 200 && esperado === 404) {
        console.log(
          `${VERMELHO}   └─ 200 num 404 é soft-404: o Google indexa a página de erro como conteúdo real.${RESET}`
        );
      }
    }
  }

  return falhas;
}

function formatarCelula(valor, tamanho, divergente) {
  const bruto = truncar(valor, tamanho);
  return divergente ? `${VERMELHO}${bruto}${RESET}` : bruto;
}

async function main() {
  const [baseProducao, basePreview] = process.argv.slice(2);
  if (!baseProducao) {
    console.error(
      "Uso: node scripts/audit-urls.mjs <base-producao> [base-preview]\n" +
        "Sem a segunda base, roda só as asserções de status HTTP."
    );
    process.exitCode = 1;
    return;
  }

  let falhasStatus = await auditarStatus(baseProducao, "produção");
  if (basePreview) {
    falhasStatus += await auditarStatus(basePreview, "preview");
  }

  // Sem a segunda base não há o que comparar — só as asserções acima valem.
  if (!basePreview) {
    console.log(
      falhasStatus === 0
        ? `\n${VERDE}Todas as asserções de status passaram.${RESET}`
        : `\n${VERMELHO}${falhasStatus} asserção(ões) de status falharam.${RESET}`
    );
    process.exitCode = falhasStatus === 0 ? 0 : 1;
    return;
  }

  console.log("");

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
  if (falhasStatus > 0) {
    console.log(`${VERMELHO}${falhasStatus} asserção(ões) de status falharam.${RESET}`);
  }

  process.exitCode = totalDivergencias === 0 && falhasStatus === 0 ? 0 : 1;
}

main();
