/* Atualiza as entradas /blog/ de dist/sitemap.xml a partir de content/blog/*.md, sem tocar
 * nas entradas não-blog. Usa marcadores de comentário para delimitar o bloco regenerado.
 */
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');
const { dataParaIso } = require('./gerador-artigo');

const MARCADOR_INICIO = '<!-- blog:inicio -->';
const MARCADOR_FIM = '<!-- blog:fim -->';
const BASE_URL = 'https://rtcapitalimobiliario.com.br';

function maiorDataIso(listaDeDados) {
  return listaDeDados
    .map(dados => dataParaIso(dados.data))
    .reduce((maior, atual) => (atual > maior ? atual : maior));
}

function entradaUrl(loc, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n');
}

function montarBlocoBlog(listaDeDados) {
  const hoje = new Date().toISOString().slice(0, 10);
  const linhas = [
    entradaUrl(`${BASE_URL}/blog/`, listaDeDados.length ? maiorDataIso(listaDeDados) : hoje, 'weekly', '0.8')
  ];
  const ordenada = [...listaDeDados].sort((a, b) => a.slug.localeCompare(b.slug));
  for (const dados of ordenada) {
    linhas.push(entradaUrl(`${BASE_URL}/blog/${dados.slug}/`, dataParaIso(dados.data), 'monthly', '0.7'));
  }
  return linhas.join('\n');
}

function montarSitemap(xmlAtual, listaDeDados) {
  if (!xmlAtual.includes(MARCADOR_INICIO) || !xmlAtual.includes(MARCADOR_FIM)) {
    throw new Error('sitemap.xml sem marcadores blog:inicio/blog:fim — migre o arquivo manualmente uma vez');
  }
  const antes = xmlAtual.split(MARCADOR_INICIO)[0] + MARCADOR_INICIO + '\n';
  const depois = '\n  ' + MARCADOR_FIM + xmlAtual.split(MARCADOR_FIM)[1];
  return antes + montarBlocoBlog(listaDeDados) + depois;
}

function gerarSitemap(pastaContentBlog, caminhoSitemap) {
  const arquivos = fs.readdirSync(pastaContentBlog).filter(f => f.endsWith('.md'));
  const listaDeDados = arquivos.map(arquivo =>
    parseFrontmatter(fs.readFileSync(path.join(pastaContentBlog, arquivo), 'utf-8')).dados
  );
  const xmlAtual = fs.readFileSync(caminhoSitemap, 'utf-8');
  fs.writeFileSync(caminhoSitemap, montarSitemap(xmlAtual, listaDeDados), 'utf-8');
}

module.exports = { montarSitemap, montarBlocoBlog, gerarSitemap, MARCADOR_INICIO, MARCADOR_FIM };
