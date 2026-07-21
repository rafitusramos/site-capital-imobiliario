#!/usr/bin/env node
/* CLI: npm run blog:validar — valida content/blog/*.md sem gerar nada. */
const path = require('path');
const { validarTudo } = require('./validador');

const PASTA_CONTENT = path.join(__dirname, '..', '..', 'content', 'blog');
const PASTA_DIST = path.join(__dirname, '..', '..', 'dist');

const { erros, avisos } = validarTudo(PASTA_CONTENT, PASTA_DIST);

for (const aviso of avisos) console.warn(`AVISO: ${aviso}`);
for (const erro of erros) console.error(`ERRO: ${erro}`);

if (erros.length > 0) {
  console.error(`\n${erros.length} erro(s) encontrado(s).`);
  process.exit(1);
}
console.log(`OK: ${avisos.length} aviso(s), 0 erro(s).`);
