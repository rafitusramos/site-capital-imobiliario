#!/usr/bin/env node
/* CLI: npm run blog:gerar — regenera dist/blog, posts.js e sitemap.xml a partir de content/blog/*.md. */
const path = require('path');
const { gerarTudo } = require('./gerar');

const RAIZ = path.join(__dirname, '..', '..');

const resultado = gerarTudo({
  pastaContentBlog: path.join(RAIZ, 'content', 'blog'),
  pastaDist: path.join(RAIZ, 'dist'),
  pastaDistBlog: path.join(RAIZ, 'dist', 'blog'),
  pastaTemplates: path.join(RAIZ, 'tools', 'templates'),
  caminhoPostsJs: path.join(RAIZ, 'dist', 'assets', 'js', 'posts.js'),
  caminhoSitemap: path.join(RAIZ, 'dist', 'sitemap.xml'),
  caminhoTemplateIndice: path.join(RAIZ, 'tools', 'templates', 'indice.html'),
  caminhoDistIndiceBlog: path.join(RAIZ, 'dist', 'blog', 'index.html')
});

for (const aviso of resultado.avisos) console.warn(`AVISO: ${aviso}`);
for (const erro of resultado.erros) console.error(`ERRO: ${erro}`);

if (!resultado.ok) {
  console.error(`\n${resultado.erros.length} erro(s) encontrado(s). Nada foi gerado.`);
  process.exit(1);
}

for (const slug of resultado.relatorio.removidos) {
  console.warn(`AVISO: artigo removido de content/blog — pasta dist/blog/${slug}/ apagada.`);
}
console.log(`OK: ${resultado.relatorio.gerados.length} artigo(s) gerado(s), ${resultado.relatorio.removidos.length} removido(s).`);
