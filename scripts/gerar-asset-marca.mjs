#!/usr/bin/env node
/* Gera lib/imoveis/marca-dagua-asset.ts a partir de public/marca-dagua.png.
 *
 * Por que o selo vira string base64 embutida no bundle, e não um arquivo lido
 * em runtime: `public/` é publicado na CDN, mas NÃO entra no bundle da função
 * serverless da Vercel. Um `readFile(process.cwd() + "/public/...")` funciona
 * no `next dev` e falha em produção — foi exatamente o que quebrou todo upload
 * de imagem do admin em produção, com a mensagem genérica "Não foi possível
 * processar a imagem.".
 *
 * O PNG continua sendo a fonte da verdade (e é ele que scripts/marcar-imagens.mjs
 * lê, porque roda em filesystem de verdade). Trocou o PNG, rode este script:
 *   node scripts/gerar-asset-marca.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGEM = path.join(process.cwd(), "public", "marca-dagua.png");
const DESTINO = path.join(process.cwd(), "lib", "imoveis", "marca-dagua-asset.ts");

const png = await readFile(ORIGEM);
const base64 = png.toString("base64");

const conteudo = `// GERADO POR scripts/gerar-asset-marca.mjs — NÃO EDITE À MÃO.
// Fonte: public/marca-dagua.png (${png.length} bytes).
//
// O selo vai embutido como base64 em vez de ser lido do disco porque \`public/\`
// não entra no bundle da função serverless da Vercel: ler de lá funciona no
// \`next dev\` e falha em produção. Ver scripts/gerar-asset-marca.mjs.
export const MARCA_DAGUA_BASE64 =
  "${base64}";
`;

await writeFile(DESTINO, conteudo, "utf8");
console.log(`marca-dagua-asset.ts gerado: ${png.length} bytes -> ${base64.length} chars base64`);
