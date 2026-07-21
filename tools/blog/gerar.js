/* Orquestrador: valida content/blog/*.md e, se ok, regenera dist/blog/<slug>/index.html,
 * dist/assets/js/posts.js, dist/sitemap.xml (bloco de blog) e dist/blog/index.html.
 */
const path = require('path');
const { validarTudo } = require('./validador');
const { gerarArtigos } = require('./gerador-artigo');
const { gerarPostsJs } = require('./gerador-posts-js');
const { gerarSitemap } = require('./gerador-sitemap');
const { gerarIndiceBlog } = require('./gerador-indice');

function gerarTudo(paths) {
  const { erros, avisos } = validarTudo(paths.pastaContentBlog, paths.pastaDist);
  if (erros.length > 0) {
    return { ok: false, erros, avisos, relatorio: null };
  }

  const { gerados, removidos } = gerarArtigos(paths.pastaContentBlog, paths.pastaDistBlog, paths.pastaTemplates);
  gerarPostsJs(paths.pastaContentBlog, path.join(paths.pastaTemplates, 'posts.js'), paths.caminhoPostsJs);
  gerarSitemap(paths.pastaContentBlog, paths.caminhoSitemap);
  gerarIndiceBlog(paths.caminhoTemplateIndice, paths.caminhoDistIndiceBlog);

  return { ok: true, erros: [], avisos, relatorio: { gerados, removidos } };
}

module.exports = { gerarTudo };
