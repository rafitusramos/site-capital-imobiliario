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
const { parseFrontmatter } = require('../tools/blog/frontmatter');
const { gerarArtigos } = require('../tools/blog/gerador-artigo');

const RAIZ = path.join(__dirname, '..');
const SLUG_REAL = 'home-equity-empresario-capital-de-giro';

function pastaTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'blog-gerador-teste-'));
}

function normalizarAspas(html) {
  return html.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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

  assert.strictEqual(gerado, realComMetaAtualizado);
});
