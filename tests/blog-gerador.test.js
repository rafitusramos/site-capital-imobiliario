/* Testes do gerador de HTML do blog (node --test).
 * Cobre o item 4.3 da ESPECIFICACAO-ADMIN-BLOG.md: o artigo real, regenerado a partir do
 * template + frontmatter, preserva canonical, JSON-LD BlogPosting, data-artigo-categoria,
 * CTA e zero scripts inline — e reproduz o HTML publicado hoje, exceto title/meta description/
 * og:description (que passam a vir de meta_titulo/meta_descricao do frontmatter, decisão desta
 * fase) e a codificação de aspas retas como entidade HTML (&quot;), efeito colateral inerente
 * de usar uma lib de markdown real (marked) em vez de HTML escrito à mão.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { parseFrontmatter } = require('../tools/blog/frontmatter');
const { gerarArtigos } = require('../tools/blog/gerador-artigo');
const { gerarPostsJs } = require('../tools/blog/gerador-posts-js');
const { gerarSitemap, MARCADOR_INICIO, MARCADOR_FIM } = require('../tools/blog/gerador-sitemap');
const { gerarTudo } = require('../tools/blog/gerar');

const RAIZ = path.join(__dirname, '..');
const SLUG_REAL = 'home-equity-empresario-capital-de-giro';
const TEMPLATE_POSTS_JS = path.join(RAIZ, 'tools', 'templates', 'posts.js');

function pastaTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'blog-gerador-teste-'));
}

function normalizarAspas(html) {
  return html.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function artigoFixture(overrides = {}) {
  const campos = Object.assign({
    titulo: '"Título de Teste"',
    slug: 'artigo-teste',
    meta_titulo: '"Título de Teste | Meta"',
    meta_descricao: '"Descrição de teste."',
    categoria: 'Financiamento',
    cta_pagina: '/financiamento/',
    rotulo: '"Rótulo teste"',
    data: '01-01-2026',
    resumo: '"Resumo de teste."',
    imagem: '/images/blog/artigo-teste.jpg',
    destaque: 'false'
  }, overrides);
  const linhas = Object.entries(campos).map(([k, v]) => `${k}: ${v}`);
  return `---\n${linhas.join('\n')}\n---\n\n# Corpo\n\nTexto de teste.\n`;
}

function novoWorkspace(artigos) {
  const pastaContent = pastaTemporaria();
  for (const { slug, data } of artigos) {
    fs.writeFileSync(path.join(pastaContent, `${slug}.md`), artigoFixture({ slug, data }), 'utf-8');
  }
  const pastaDist = pastaTemporaria();
  const pastaDistBlog = path.join(pastaDist, 'blog');
  fs.mkdirSync(pastaDistBlog, { recursive: true });
  const caminhoSitemap = path.join(pastaDist, 'sitemap.xml');
  fs.writeFileSync(caminhoSitemap, [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  ${MARCADOR_INICIO}`,
    `  ${MARCADOR_FIM}`,
    '</urlset>'
  ].join('\n'), 'utf-8');

  return {
    pastaContentBlog: pastaContent,
    pastaDist,
    pastaDistBlog,
    pastaTemplates: path.join(RAIZ, 'tools', 'templates'),
    caminhoPostsJs: path.join(pastaDist, 'assets', 'js', 'posts.js'),
    caminhoSitemap,
    caminhoTemplateIndice: path.join(RAIZ, 'tools', 'templates', 'indice.html'),
    caminhoDistIndiceBlog: path.join(pastaDistBlog, 'index.html')
  };
}

function snapshot(paths) {
  const arquivos = [];
  (function coletar(pasta) {
    for (const nome of fs.readdirSync(pasta)) {
      const caminho = path.join(pasta, nome);
      if (fs.statSync(caminho).isDirectory()) coletar(caminho);
      else arquivos.push(caminho);
    }
  })(paths.pastaDistBlog);
  arquivos.push(paths.caminhoPostsJs, paths.caminhoSitemap);

  const mapa = {};
  for (const caminho of arquivos.sort()) {
    mapa[caminho] = fs.readFileSync(caminho, 'utf-8');
  }
  return mapa;
}

function carregarPostsJs(caminho) {
  const codigo = fs.readFileSync(caminho, 'utf-8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox);
  return sandbox.window.BLOG_POSTS;
}

test('artigo real regenerado preserva canonical, JSON-LD, categoria, CTA e zero scripts inline', () => {
  const pastaDist = pastaTemporaria();
  gerarArtigos(
    path.join(RAIZ, 'content', 'blog'),
    pastaDist,
    path.join(RAIZ, 'tools', 'templates')
  );
  const gerado = fs.readFileSync(path.join(pastaDist, SLUG_REAL, 'index.html'), 'utf-8');

  assert.ok(gerado.includes(
    `<link rel="canonical" href="https://rtcapitalimobiliario.com.br/blog/${SLUG_REAL}/">`
  ));
  assert.ok(gerado.includes('"@type": "BlogPosting"'));
  assert.ok(gerado.includes('data-artigo-categoria="Home Equity"'));
  assert.ok(gerado.includes('class="artigo-cta"') && gerado.includes('href="/home_equity/"'));
  for (const m of gerado.matchAll(/<script([^>]*)>/g)) {
    assert.ok(
      m[1].includes('src=') || m[1].includes('application/ld+json'),
      `script sem src e sem ser JSON-LD: <script${m[1]}>`
    );
  }
});

test('artigo real regenerado bate byte-a-byte com o publicado, exceto title/meta description/og:description', () => {
  const pastaDist = pastaTemporaria();
  gerarArtigos(
    path.join(RAIZ, 'content', 'blog'),
    pastaDist,
    path.join(RAIZ, 'tools', 'templates')
  );
  const gerado = normalizarAspas(fs.readFileSync(path.join(pastaDist, SLUG_REAL, 'index.html'), 'utf-8'));

  const caminhoReal = path.join(RAIZ, 'dist', 'blog', SLUG_REAL, 'index.html');
  const real = fs.readFileSync(caminhoReal, 'utf-8');
  const { dados } = parseFrontmatter(
    fs.readFileSync(path.join(RAIZ, 'content', 'blog', `${SLUG_REAL}.md`), 'utf-8')
  );

  const realComMetaAtualizado = real
    .replace(/<title>.*<\/title>/, `<title>${dados.meta_titulo}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${dados.meta_descricao}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${dados.meta_descricao}">`);

  assert.strictEqual(gerado, normalizarAspas(realComMetaAtualizado));
});

test('posts.js gerado: ordenado por data desc, campos completos, parseável em Node', () => {
  const pastaContent = pastaTemporaria();
  fs.writeFileSync(path.join(pastaContent, 'meio.md'), artigoFixture({ slug: 'meio', data: '10-05-2026' }), 'utf-8');
  fs.writeFileSync(path.join(pastaContent, 'mais-novo.md'), artigoFixture({ slug: 'mais-novo', data: '20-06-2026' }), 'utf-8');
  fs.writeFileSync(path.join(pastaContent, 'mais-antigo.md'), artigoFixture({ slug: 'mais-antigo', data: '01-01-2026' }), 'utf-8');

  const caminhoPostsJs = path.join(pastaTemporaria(), 'posts.js');
  gerarPostsJs(pastaContent, TEMPLATE_POSTS_JS, caminhoPostsJs);

  const posts = carregarPostsJs(caminhoPostsJs);
  const slugs = Array.from(posts, p => p.slug);
  assert.deepStrictEqual(slugs, ['mais-novo', 'meio', 'mais-antigo']);
  for (const post of Array.from(posts)) {
    for (const campo of ['slug', 'titulo', 'categoria', 'rotulo', 'data', 'resumo', 'imagem', 'destaque']) {
      assert.ok(post[campo] !== undefined, `campo "${campo}" ausente em ${post.slug}`);
    }
  }
});

test('sitemap gerado contém exatamente as URLs /blog/<slug>/ dos artigos existentes', () => {
  const pastaContent = pastaTemporaria();
  fs.writeFileSync(path.join(pastaContent, 'artigo-a.md'), artigoFixture({ slug: 'artigo-a', data: '05-02-2026' }), 'utf-8');
  fs.writeFileSync(path.join(pastaContent, 'artigo-b.md'), artigoFixture({ slug: 'artigo-b', data: '15-03-2026' }), 'utf-8');

  const caminhoSitemap = path.join(pastaTemporaria(), 'sitemap.xml');
  const xmlBase = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    '    <loc>https://rtcapitalimobiliario.com.br/</loc>',
    '    <lastmod>2026-07-20</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    `  ${MARCADOR_INICIO}`,
    `  ${MARCADOR_FIM}`,
    '</urlset>'
  ].join('\n');
  fs.writeFileSync(caminhoSitemap, xmlBase, 'utf-8');

  gerarSitemap(pastaContent, caminhoSitemap);
  const gerado = fs.readFileSync(caminhoSitemap, 'utf-8');

  assert.ok(gerado.includes('<loc>https://rtcapitalimobiliario.com.br/</loc>'), 'entrada não-blog preservada');

  const bloco = gerado.split(MARCADOR_INICIO)[1].split(MARCADOR_FIM)[0];
  const slugsNoSitemap = new Set(
    Array.from(bloco.matchAll(/<loc>https:\/\/rtcapitalimobiliario\.com\.br\/blog\/([a-z0-9-]+)\/<\/loc>/g)).map(m => m[1])
  );
  assert.deepStrictEqual(slugsNoSitemap, new Set(['artigo-a', 'artigo-b']));
});

test('blog:gerar é idempotente (rodar 2x seguidas não muda nenhum arquivo)', () => {
  const paths = novoWorkspace([
    { slug: 'artigo-a', data: '01-02-2026' },
    { slug: 'artigo-b', data: '02-03-2026' }
  ]);

  const r1 = gerarTudo(paths);
  assert.ok(r1.ok, JSON.stringify(r1.erros));
  const antes = snapshot(paths);

  const r2 = gerarTudo(paths);
  assert.ok(r2.ok, JSON.stringify(r2.erros));
  const depois = snapshot(paths);

  assert.deepStrictEqual(depois, antes);
});

test('artigo removido de content/blog tem sua pasta removida de dist/blog (com aviso)', () => {
  const paths = novoWorkspace([
    { slug: 'fica', data: '01-01-2026' },
    { slug: 'sai', data: '02-01-2026' }
  ]);

  gerarTudo(paths);
  assert.ok(fs.existsSync(path.join(paths.pastaDistBlog, 'sai')));

  fs.unlinkSync(path.join(paths.pastaContentBlog, 'sai.md'));
  const resultado = gerarTudo(paths);

  assert.ok(resultado.ok, JSON.stringify(resultado.erros));
  assert.ok(!fs.existsSync(path.join(paths.pastaDistBlog, 'sai')));
  assert.ok(fs.existsSync(path.join(paths.pastaDistBlog, 'fica')));
  assert.ok(resultado.relatorio.removidos.includes('sai'));
});
