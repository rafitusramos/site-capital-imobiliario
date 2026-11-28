// Auditoria das dependências de produção com lista de exceções aceitas.
//
// Bloqueia (exit 1) qualquer advisory de severidade alta ou crítica, EXCETO os
// listados em ACEITOS — e cada exceção vale só para o caminho declarado em
// node_modules. O mesmo advisory em outro lugar (ex.: no nosso `postcss` de
// topo) continua bloqueando.
//
// Uso: node .github/scripts/auditoria-dependencias.mjs
// (roda `npm audit --omit=dev --json`; ou leia de um arquivo com --arquivo <json>)

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SEVERIDADES_BLOQUEANTES = new Set(["high", "critical"]);

/**
 * Exceções aceitas. Cada uma: advisory (URL do GHSA), caminho exato em
 * node_modules, motivo e quando remover. Exceção sem condição de saída não entra.
 */
const ACEITOS = [
  ...[
    "GHSA-qx2v-qp2m-jg93",
    "GHSA-6g55-p6wh-862q",
    "GHSA-fxqj-rqcc-2cmp",
    "GHSA-r28c-9q8g-f849",
  ].map((ghsa) => ({
    ghsa,
    caminho: "node_modules/next/node_modules/postcss",
    motivo:
      "postcss 8.4.31 embutido (versão exata) no next 15.5.x; só o Next 16 troca. " +
      "É ferramenta de CSS em tempo de build, não processa entrada de visitante. " +
      "Nosso postcss de topo já está corrigido.",
    removerQuando: "atualizar para o Next 16",
  })),
];

function lerRelatorio() {
  const i = process.argv.indexOf("--arquivo");
  if (i !== -1) return readFileSync(process.argv[i + 1], "utf8");
  try {
    return execSync("npm audit --omit=dev --json", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    // npm audit sai com código != 0 quando há vulnerabilidade; o JSON vem no stdout.
    if (e.stdout) return e.stdout;
    throw e;
  }
}

const ghsaDaUrl = (url) => (url ?? "").split("/").pop();

const relatorio = JSON.parse(lerRelatorio().replace(/^﻿/, ""));
const bloqueantes = [];
const aceitosEncontrados = [];

for (const [pacote, vuln] of Object.entries(relatorio.vulnerabilities ?? {})) {
  // Só os advisories diretos (objetos em `via`). Entradas que só herdam de outro
  // pacote (strings em `via`) são avaliadas no pacote de origem.
  for (const via of vuln.via ?? []) {
    if (typeof via !== "object" || !SEVERIDADES_BLOQUEANTES.has(via.severity)) continue;
    const ghsa = ghsaDaUrl(via.url);
    const nos = vuln.nodes ?? [];
    const aceito =
      nos.length > 0 &&
      nos.every((no) => ACEITOS.some((a) => a.ghsa === ghsa && a.caminho === no));
    const linha = `${pacote} ${via.severity} ${ghsa} em ${nos.join(", ")}: ${via.title}`;
    if (aceito) aceitosEncontrados.push(linha);
    else bloqueantes.push(linha);
  }
}

for (const l of aceitosEncontrados) console.log(`aceito (ver ACEITOS): ${l}`);

if (bloqueantes.length > 0) {
  for (const l of bloqueantes) console.log(`::error::${l}`);
  console.log(`\n${bloqueantes.length} advisory(s) alto(s)/crítico(s) fora da lista de exceções.`);
  process.exit(1);
}

console.log(
  `OK: nenhum advisory alto/crítico fora das exceções (${aceitosEncontrados.length} aceito(s)). ` +
    `Resumo do npm: ${JSON.stringify(relatorio.metadata?.vulnerabilities ?? {})}`,
);
