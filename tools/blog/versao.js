/* Atualiza cache-busting (?v=N) de forma consistente em dist/ e templates/. */
const fs = require('fs');
const path = require('path');
const { validarTudo } = require('./validador');
const { gerarArtigos } = require('./gerador-artigo');
const { gerarIndiceBlog } = require('./gerador-indice');

function substituirVersao(conteudo, novaVersao) {
  return conteudo.replace(/\?v=\d+/g, `?v=${novaVersao}`);
}

function validarVersaoArg(bruto) {
  if (typeof bruto !== 'string' || bruto === '' || !/^[1-9]\d*$/.test(bruto)) {
    throw new Error(`versão inválida: "${bruto}" (deve ser um inteiro > 0, ex.: 5)`);
  }
  return bruto;
}

function atualizarArquivo(caminho, novaVersao) {
  const conteudoAntigo = fs.readFileSync(caminho, 'utf-8');
  const conteudoNovo = substituirVersao(conteudoAntigo, novaVersao);
  if (conteudoAntigo === conteudoNovo) return false; // sem mudança
  fs.writeFileSync(caminho, conteudoNovo, 'utf-8');
  return true;
}

function atualizarVersao(paths, novaVersao) {
  // 1) Valida content/blog antes de fazer qualquer mudança
  const { erros, avisos } = validarTudo(paths.pastaContentBlog, paths.pastaDist);
  if (erros.length > 0) {
    return { ok: false, erros, avisos, relatorio: null };
  }

  // 2) Atualiza 4 arquivos estáticos + 2 templates
  const alterados = [];
  for (const caminho of paths.arquivosVersao) {
    if (atualizarArquivo(caminho, novaVersao)) {
      alterados.push(path.relative(paths.raiz, caminho));
    }
  }
  for (const caminho of paths.templatesVersao) {
    if (atualizarArquivo(caminho, novaVersao)) {
      alterados.push(path.relative(paths.raiz, caminho));
    }
  }

  // 3) Regenera dist/blog/* usando templates já bumpados
  const { gerados, removidos } = gerarArtigos(
    paths.pastaContentBlog,
    paths.pastaDistBlog,
    paths.pastaTemplates
  );
  gerarIndiceBlog(paths.caminhoTemplateIndice, paths.caminhoDistIndiceBlog);

  return { ok: true, erros: [], avisos, relatorio: { alterados, gerados, removidos } };
}

module.exports = { substituirVersao, validarVersaoArg, atualizarArquivo, atualizarVersao };
