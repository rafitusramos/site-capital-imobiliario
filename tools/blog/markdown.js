/* Conversão markdown -> HTML do corpo dos artigos, via `marked`. */
const { marked } = require('marked');

marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });

function removerH1Redundante(corpoMarkdown) {
  const linhas = corpoMarkdown.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < linhas.length && linhas[i].trim() === '') i++;
  if (linhas[i] !== undefined && /^#\s+/.test(linhas[i])) linhas.splice(i, 1);
  return linhas.join('\n').replace(/^\n+/, '');
}

function corpoParaHtml(corpoMarkdown) {
  return marked.parse(removerH1Redundante(corpoMarkdown)).trim();
}

module.exports = { corpoParaHtml };
