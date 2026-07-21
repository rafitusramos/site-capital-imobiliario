#!/usr/bin/env node
/* CLI: npm run blog:versao -- N — atualiza cache-busting (?v=N) em dist/ e templates/. */
const path = require('path');
const { validarVersaoArg, atualizarVersao } = require('./versao');

const RAIZ = path.join(__dirname, '..', '..');

let novaVersao;
try {
  novaVersao = validarVersaoArg(process.argv[2]);
} catch (e) {
  console.error(`ERRO: ${e.message}`);
  process.exit(1);
}

const resultado = atualizarVersao(
  {
    raiz: RAIZ,
    pastaContentBlog: path.join(RAIZ, 'content', 'blog'),
    pastaDist: path.join(RAIZ, 'dist'),
    pastaDistBlog: path.join(RAIZ, 'dist', 'blog'),
    pastaTemplates: path.join(RAIZ, 'tools', 'templates'),
    arquivosVersao: [
      path.join(RAIZ, 'dist', 'index.html'),
      path.join(RAIZ, 'dist', 'sobre.html'),
      path.join(RAIZ, 'dist', 'financiamento', 'index.html'),
      path.join(RAIZ, 'dist', 'home_equity', 'index.html')
    ],
    templatesVersao: [
      path.join(RAIZ, 'tools', 'templates', 'artigo.html'),
      path.join(RAIZ, 'tools', 'templates', 'indice.html')
    ],
    caminhoTemplateIndice: path.join(RAIZ, 'tools', 'templates', 'indice.html'),
    caminhoDistIndiceBlog: path.join(RAIZ, 'dist', 'blog', 'index.html')
  },
  novaVersao
);

for (const aviso of resultado.avisos) console.warn(`AVISO: ${aviso}`);
for (const erro of resultado.erros) console.error(`ERRO: ${erro}`);

if (!resultado.ok) {
  console.error(`\n${resultado.erros.length} erro(s) encontrado(s). Nada foi alterado.`);
  process.exit(1);
}

console.log(`OK: ?v=${novaVersao} em ${resultado.relatorio.alterados.length} arquivo(s) atualizados.`);
console.log(`    ${resultado.relatorio.gerados.length} artigo(s) regenerado(s), ${resultado.relatorio.removidos.length} removido(s).`);
console.log(`\nLEMBRETE: CLAUDE.md (seção 2, "Convenções") documenta a versão atual em prosa.`);
console.log(`           Atualize-a à mão para refletir ?v=${novaVersao}.`);
