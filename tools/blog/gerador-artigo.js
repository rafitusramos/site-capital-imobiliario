/* Gera dist/blog/<slug>/index.html a partir do template + frontmatter de cada artigo. */
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');
const { corpoParaHtml } = require('./markdown');

function dataParaIso(ddmmyyyy) {
  const [d, m, a] = ddmmyyyy.split('-');
  return `${a}-${m}-${d}`;
}

function substituir(template, dados) {
  let saida = template;
  for (const [campo, valor] of Object.entries(dados)) {
    saida = saida.split(`{{${campo}}}`).join(valor);
  }
  return saida;
}

function gerarHtmlArtigo(dados, corpo, templateHtml) {
  const placeholders = {
    meta_titulo: dados.meta_titulo,
    titulo: dados.titulo,
    meta_descricao: dados.meta_descricao,
    slug: dados.slug,
    categoria: dados.categoria,
    data: dados.data,
    data_iso: dataParaIso(dados.data),
    imagem: dados.imagem,
    cta_pagina: dados.cta_pagina,
    corpo_html: corpoParaHtml(corpo)
  };
  return substituir(templateHtml, placeholders);
}

function gerarArtigos(pastaContentBlog, pastaDistBlog, pastaTemplates) {
  const templateHtml = fs.readFileSync(path.join(pastaTemplates, 'artigo.html'), 'utf-8');
  const arquivos = fs.readdirSync(pastaContentBlog).filter(f => f.endsWith('.md'));
  const gerados = [];

  for (const arquivo of arquivos) {
    const texto = fs.readFileSync(path.join(pastaContentBlog, arquivo), 'utf-8');
    const { dados, corpo } = parseFrontmatter(texto);
    const html = gerarHtmlArtigo(dados, corpo, templateHtml);
    const pastaArtigo = path.join(pastaDistBlog, dados.slug);
    fs.mkdirSync(pastaArtigo, { recursive: true });
    fs.writeFileSync(path.join(pastaArtigo, 'index.html'), html, 'utf-8');
    gerados.push(dados.slug);
  }

  const removidos = [];
  if (fs.existsSync(pastaDistBlog)) {
    for (const nome of fs.readdirSync(pastaDistBlog)) {
      const caminho = path.join(pastaDistBlog, nome);
      if (fs.statSync(caminho).isDirectory() && !gerados.includes(nome)) {
        fs.rmSync(caminho, { recursive: true, force: true });
        removidos.push(nome);
      }
    }
  }

  return { gerados, removidos };
}

module.exports = { gerarHtmlArtigo, gerarArtigos, dataParaIso };
