#!/usr/bin/env node
/* Gera lib/simulacao/fontes-asset.ts a partir dos woff2 de app/fonts/arquivos.
 *
 * Mesmo motivo de scripts/gerar-asset-marca.mjs: o PDF da simulação é montado
 * no servidor e `public/` (e o filesystem do projeto) não existem na função da
 * Vercel. As fontes vão embutidas em base64 no bundle.
 *
 * Mudou uma fonte (ou o peso usado no documento)? Rode:
 *   node scripts/gerar-fontes-simulacao.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PASTA = path.join(process.cwd(), "app", "fonts", "arquivos");
const DESTINO = path.join(process.cwd(), "lib", "simulacao", "fontes-asset.ts");

const FONTES = {
  caslon: "libre-caslon-text-latin-400.woff2",
  archivo: "archivo-latin-variavel.woff2",
  plex: "ibm-plex-mono-latin-400.woff2",
  plex500: "ibm-plex-mono-latin-500.woff2",
};

const linhas = [];
for (const [chave, arquivo] of Object.entries(FONTES)) {
  const b64 = (await readFile(path.join(PASTA, arquivo))).toString("base64");
  linhas.push(`  ${chave}: "${b64}",`);
}

const saida = `// GERADO por scripts/gerar-fontes-simulacao.mjs (woff2 de app/fonts/arquivos em base64). Não edite à mão.
// Servidor lê fonte daqui porque public/ e o filesystem não existem na função da Vercel.
import "server-only";
export const FONTES_SIMULACAO: Record<"caslon" | "archivo" | "plex" | "plex500", string> = {
${linhas.join("\n")}
};
`;
await writeFile(DESTINO, saida);
console.log("fontes embutidas em", path.relative(process.cwd(), DESTINO));
