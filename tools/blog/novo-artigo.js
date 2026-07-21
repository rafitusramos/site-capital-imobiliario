/* Funções puras para criação de novo artigo (testável sem readline/interação). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function dataHojeDDMMYYYY(agora = new Date()) {
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

function sugerirCtaPagina(categoria, mapaCategorias) {
  return (mapaCategorias[categoria] && mapaCategorias[categoria].lp) || '/';
}

function sugerirImagem(slug) {
  return `/images/blog/${slug}.jpg`;
}

function carregarMapaCategorias(caminhoTemplatePostsJs) {
  let codigo = fs.readFileSync(caminhoTemplatePostsJs, 'utf-8');
  // Se o arquivo é um template (contém {{lista_posts}}), substitui por array vazio
  codigo = codigo.replace(/{{lista_posts}}/, '{}');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox);
  return sandbox.window.BLOG_CATEGORIAS;
}

function montarConteudoArtigo(dados) {
  const linhas = [
    '---',
    `titulo: "${dados.titulo}"`,
    `slug: ${dados.slug}`,
    `meta_titulo: "${dados.metaTitulo}"`,
    `meta_descricao: "${dados.metaDescricao}"`,
    `categoria: ${dados.categoria}`,
    `cta_pagina: ${dados.ctaPagina}`,
    `rotulo: "${dados.rotulo}"`,
    `data: ${dados.data}`,
    `resumo: "${dados.resumo}"`,
    `imagem: ${dados.imagem}`,
    `destaque: ${dados.destaque ? 'true' : 'false'}`,
    '---',
    '',
    `# ${dados.titulo}`,
    '',
    'Conteúdo do artigo aqui.',
    ''
  ];
  return linhas.join('\n');
}

function criarArtigo(pastaContentBlog, dados) {
  const caminhoMd = path.join(pastaContentBlog, `${dados.slug}.md`);
  if (fs.existsSync(caminhoMd)) {
    throw new Error(`artigo com slug "${dados.slug}" já existe`);
  }
  const conteudo = montarConteudoArtigo(dados);
  fs.mkdirSync(pastaContentBlog, { recursive: true });
  fs.writeFileSync(caminhoMd, conteudo, 'utf-8');
}

module.exports = {
  dataHojeDDMMYYYY,
  sugerirCtaPagina,
  sugerirImagem,
  carregarMapaCategorias,
  montarConteudoArtigo,
  criarArtigo
};
