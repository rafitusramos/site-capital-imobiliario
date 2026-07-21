/* Gera dist/assets/js/posts.js (window.BLOG_POSTS, ordenado por data desc) a partir de
 * content/blog/*.md, usando tools/templates/posts.js como casca (cabeçalho + BLOG_CATEGORIAS
 * + module.exports fixos, só a lista BLOG_POSTS é reconstruída).
 */
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

const CAMPOS_POST = ['slug', 'titulo', 'categoria', 'rotulo', 'data', 'resumo', 'imagem'];

function dataParaChaveOrdenacao(ddmmyyyy) {
  const [d, m, a] = ddmmyyyy.split('-');
  return Number(`${a}${m}${d}`);
}

function ordenarPorDataDesc(listaDeDados) {
  return [...listaDeDados].sort((a, b) => {
    const diff = dataParaChaveOrdenacao(b.data) - dataParaChaveOrdenacao(a.data);
    return diff !== 0 ? diff : a.slug.localeCompare(b.slug);
  });
}

function valorString(v) {
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function serializarPost(dados) {
  const linhas = ['  {'];
  for (const campo of CAMPOS_POST) {
    linhas.push(`    ${campo}: ${valorString(dados[campo])},`);
  }
  linhas.push(`    destaque: ${dados.destaque === true ? 'true' : 'false'}`);
  linhas.push('  }');
  return linhas.join('\n');
}

function montarListaPosts(listaOrdenada) {
  return listaOrdenada.map(serializarPost).join(',\n');
}

function montarPostsJs(listaDeDados, templateJs) {
  const listaTexto = montarListaPosts(ordenarPorDataDesc(listaDeDados));
  return templateJs.split('{{lista_posts}}').join(listaTexto);
}

function gerarPostsJs(pastaContentBlog, caminhoTemplatePostsJs, caminhoDistPostsJs) {
  const arquivos = fs.readdirSync(pastaContentBlog).filter(f => f.endsWith('.md'));
  const listaDeDados = arquivos.map(arquivo => {
    const texto = fs.readFileSync(path.join(pastaContentBlog, arquivo), 'utf-8');
    return parseFrontmatter(texto).dados;
  });
  const templateJs = fs.readFileSync(caminhoTemplatePostsJs, 'utf-8');
  const saida = montarPostsJs(listaDeDados, templateJs);
  fs.mkdirSync(path.dirname(caminhoDistPostsJs), { recursive: true });
  fs.writeFileSync(caminhoDistPostsJs, saida, 'utf-8');
}

module.exports = { montarPostsJs, gerarPostsJs, ordenarPorDataDesc, dataParaChaveOrdenacao };
