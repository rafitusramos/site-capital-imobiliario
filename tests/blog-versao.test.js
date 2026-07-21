/* Testes de atualização de cache-busting (node --test).
 * Cobre substituição de ?v=N, validação de argumento, idempotência e propagação aos artigos.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { substituirVersao, validarVersaoArg, atualizarArquivo, atualizarVersao } = require('../tools/blog/versao');

const RAIZ = path.join(__dirname, '..');

function pastaTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'blog-versao-teste-'));
}

test('substituirVersao: substitui múltiplas ocorrências de ?v=N', () => {
  const conteudo = 'href="/css/a.css?v=3" src="/js/b.js?v=3"';
  const resultado = substituirVersao(conteudo, '5');
  assert.strictEqual(resultado, 'href="/css/a.css?v=5" src="/js/b.js?v=5"');
});

test('substituirVersao: idempotência — aplicado 2x com mesmo N não muda', () => {
  const conteudo = 'href="/css/a.css?v=5" src="/js/b.js?v=5"';
  const umaVez = substituirVersao(conteudo, '5');
  const duasVezes = substituirVersao(umaVez, '5');
  assert.strictEqual(umaVez, duasVezes);
});

test('validarVersaoArg: aceita strings numéricas > 0', () => {
  assert.doesNotThrow(() => validarVersaoArg('1'));
  assert.doesNotThrow(() => validarVersaoArg('5'));
  assert.doesNotThrow(() => validarVersaoArg('999'));
});

test('validarVersaoArg: rejeita "0", "-1", "3.5", "01", "", undefined', () => {
  const invalidos = ['0', '-1', '3.5', '01', '', undefined];
  for (const inv of invalidos) {
    assert.throws(() => validarVersaoArg(inv), Error);
  }
});

test('atualizarArquivo: grava arquivo e detecta mudança vs. idempotência', () => {
  const temp = pastaTemporaria();
  const caminho = path.join(temp, 'test.html');
  fs.writeFileSync(caminho, '?v=3', 'utf-8');

  // Primeira atualização: deve mudar
  const mudou1 = atualizarArquivo(caminho, '5');
  assert.ok(mudou1);
  assert.strictEqual(fs.readFileSync(caminho, 'utf-8'), '?v=5');

  // Segunda atualização com mesmo N: sem mudança
  const mudou2 = atualizarArquivo(caminho, '5');
  assert.ok(!mudou2);
  assert.strictEqual(fs.readFileSync(caminho, 'utf-8'), '?v=5');

  // Terceira, N diferente: muda
  const mudou3 = atualizarArquivo(caminho, '6');
  assert.ok(mudou3);
  assert.strictEqual(fs.readFileSync(caminho, 'utf-8'), '?v=6');
});

test('atualizarVersao: valida content/blog antes de fazer mudanças', () => {
  const temp = pastaTemporaria();
  const pastaContent = path.join(temp, 'content');
  fs.mkdirSync(pastaContent, { recursive: true });

  // Artigo inválido: slug fora do padrão
  fs.writeFileSync(path.join(pastaContent, 'invalido.md'),
    `---\ntitulo: Test\nslug: INVALID_SLUG\nmeta_titulo: T\nmeta_descricao: D\ncategoria: Financiamento\n` +
    `cta_pagina: /\nrotulo: R\ndata: 01-01-2026\nresumo: Res\nimagem: /img\ndestaque: false\n---\n\n# Corpo\n`,
    'utf-8'
  );

  const pastaDist = path.join(temp, 'dist');
  fs.mkdirSync(pastaDist, { recursive: true });

  const resultado = atualizarVersao({
    raiz: temp,
    pastaContentBlog: pastaContent,
    pastaDist: pastaDist,
    pastaDistBlog: path.join(pastaDist, 'blog'),
    pastaTemplates: path.join(RAIZ, 'tools', 'templates'),
    arquivosVersao: [],
    templatesVersao: [],
    caminhoTemplateIndice: path.join(RAIZ, 'tools', 'templates', 'indice.html'),
    caminhoDistIndiceBlog: path.join(pastaDist, 'blog', 'index.html')
  });

  assert.ok(!resultado.ok, 'deve falhar com conteúdo inválido');
  assert.ok(resultado.erros.length > 0);
  assert.ok(resultado.relatorio === null);
});

test('atualizarVersao: atualiza 4 estáticos + 2 templates e regenera artigos', () => {
  const temp = pastaTemporaria();

  // Cria conteúdo: artigo válido
  const pastaContent = path.join(temp, 'content');
  fs.mkdirSync(pastaContent, { recursive: true });
  fs.writeFileSync(path.join(pastaContent, 'teste.md'),
    `---\ntitulo: Test\nslug: teste\nmeta_titulo: T\nmeta_descricao: D\ncategoria: Financiamento\n` +
    `cta_pagina: /\nrotulo: R\ndata: 01-01-2026\nresumo: Res\nimagem: /images/blog/teste.jpg\ndestaque: false\n---\n\n# Corpo\n`,
    'utf-8'
  );

  // Cria dist com estrutura mínima
  const pastaDist = path.join(temp, 'dist');
  const pastaDistBlog = path.join(pastaDist, 'blog');
  fs.mkdirSync(pastaDistBlog, { recursive: true });

  // Cria 4 arquivos estáticos com ?v=3
  const arquivos = [
    path.join(pastaDist, 'index.html'),
    path.join(pastaDist, 'sobre.html'),
    path.join(pastaDist, 'financiamento', 'index.html'),
    path.join(pastaDist, 'home_equity', 'index.html')
  ];
  for (const arq of arquivos) {
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    fs.writeFileSync(arq, 'href="/css/a.css?v=3"', 'utf-8');
  }

  // Copia templates reais e atualiza versão neles manualmente para teste
  const pastaTemplates = path.join(temp, 'templates');
  fs.mkdirSync(pastaTemplates, { recursive: true });
  const templateArtigoReal = fs.readFileSync(path.join(RAIZ, 'tools', 'templates', 'artigo.html'), 'utf-8');
  const templateIndiceReal = fs.readFileSync(path.join(RAIZ, 'tools', 'templates', 'indice.html'), 'utf-8');
  // Para este teste, versão é ?v=3
  fs.writeFileSync(path.join(pastaTemplates, 'artigo.html'), templateArtigoReal.replace(/\?v=\d+/g, '?v=3'), 'utf-8');
  fs.writeFileSync(path.join(pastaTemplates, 'indice.html'), templateIndiceReal.replace(/\?v=\d+/g, '?v=3'), 'utf-8');

  // Cria estrutura de posts.js mínima (copiada do real, só leitura)
  const postsJsReal = fs.readFileSync(path.join(RAIZ, 'tools', 'templates', 'posts.js'), 'utf-8');
  fs.writeFileSync(path.join(pastaTemplates, 'posts.js'), postsJsReal, 'utf-8');

  const resultado = atualizarVersao(
    {
      raiz: temp,
      pastaContentBlog: pastaContent,
      pastaDist: pastaDist,
      pastaDistBlog: pastaDistBlog,
      pastaTemplates: pastaTemplates,
      arquivosVersao: arquivos,
      templatesVersao: [
        path.join(pastaTemplates, 'artigo.html'),
        path.join(pastaTemplates, 'indice.html')
      ],
      caminhoTemplateIndice: path.join(pastaTemplates, 'indice.html'),
      caminhoDistIndiceBlog: path.join(pastaDistBlog, 'index.html')
    },
    '5'
  );

  assert.ok(resultado.ok, JSON.stringify(resultado.erros));
  assert.strictEqual(resultado.relatorio.alterados.length, 6, '4 estáticos + 2 templates');
  assert.ok(resultado.relatorio.gerados.length > 0, 'deve gerar artigos');

  // Verifica que os arquivos foram de fato atualizados para v=5
  for (const arq of arquivos) {
    const conteudo = fs.readFileSync(arq, 'utf-8');
    assert.ok(conteudo.includes('?v=5'), `${arq} deve ter ?v=5`);
  }

  // Verifica templates
  for (const tmpl of [path.join(pastaTemplates, 'artigo.html'), path.join(pastaTemplates, 'indice.html')]) {
    const conteudo = fs.readFileSync(tmpl, 'utf-8');
    assert.ok(conteudo.includes('?v=5'), `${tmpl} deve ter ?v=5`);
  }

  // Verifica que artigos regenerados também têm v=5
  const artigoGerado = fs.readFileSync(path.join(pastaDistBlog, 'teste', 'index.html'), 'utf-8');
  assert.ok(artigoGerado.includes('?v=5'), 'artigo regenerado deve ter ?v=5');
});

test('atualizarVersao: é idempotente (rodar 2x com mesmo N não muda nada)', () => {
  const temp = pastaTemporaria();

  // Setup similar ao teste anterior
  const pastaContent = path.join(temp, 'content');
  fs.mkdirSync(pastaContent, { recursive: true });
  fs.writeFileSync(path.join(pastaContent, 'teste.md'),
    `---\ntitulo: Test\nslug: teste\nmeta_titulo: T\nmeta_descricao: D\ncategoria: Financiamento\n` +
    `cta_pagina: /\nrotulo: R\ndata: 01-01-2026\nresumo: Res\nimagem: /images/blog/teste.jpg\ndestaque: false\n---\n\n# Corpo\n`,
    'utf-8'
  );

  const pastaDist = path.join(temp, 'dist');
  const pastaDistBlog = path.join(pastaDist, 'blog');
  fs.mkdirSync(pastaDistBlog, { recursive: true });

  const arquivos = [
    path.join(pastaDist, 'index.html'),
    path.join(pastaDist, 'sobre.html'),
    path.join(pastaDist, 'financiamento', 'index.html'),
    path.join(pastaDist, 'home_equity', 'index.html')
  ];
  for (const arq of arquivos) {
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    fs.writeFileSync(arq, 'href="/css/a.css?v=3"', 'utf-8');
  }

  const pastaTemplates = path.join(temp, 'templates');
  fs.mkdirSync(pastaTemplates, { recursive: true });
  const templateArtigoReal = fs.readFileSync(path.join(RAIZ, 'tools', 'templates', 'artigo.html'), 'utf-8');
  const templateIndiceReal = fs.readFileSync(path.join(RAIZ, 'tools', 'templates', 'indice.html'), 'utf-8');
  fs.writeFileSync(path.join(pastaTemplates, 'artigo.html'), templateArtigoReal.replace(/\?v=\d+/g, '?v=3'), 'utf-8');
  fs.writeFileSync(path.join(pastaTemplates, 'indice.html'), templateIndiceReal.replace(/\?v=\d+/g, '?v=3'), 'utf-8');
  const postsJsReal = fs.readFileSync(path.join(RAIZ, 'tools', 'templates', 'posts.js'), 'utf-8');
  fs.writeFileSync(path.join(pastaTemplates, 'posts.js'), postsJsReal, 'utf-8');

  const paths = {
    raiz: temp,
    pastaContentBlog: pastaContent,
    pastaDist: pastaDist,
    pastaDistBlog: pastaDistBlog,
    pastaTemplates: pastaTemplates,
    arquivosVersao: arquivos,
    templatesVersao: [
      path.join(pastaTemplates, 'artigo.html'),
      path.join(pastaTemplates, 'indice.html')
    ],
    caminhoTemplateIndice: path.join(pastaTemplates, 'indice.html'),
    caminhoDistIndiceBlog: path.join(pastaDistBlog, 'index.html')
  };

  // Primeira execução: v=3 → v=5
  const r1 = atualizarVersao(paths, '5');
  assert.ok(r1.ok);
  const snapshot1 = {};
  for (const arq of arquivos) {
    snapshot1[arq] = fs.readFileSync(arq, 'utf-8');
  }
  snapshot1[paths.templatesVersao[0]] = fs.readFileSync(paths.templatesVersao[0], 'utf-8');
  snapshot1[paths.templatesVersao[1]] = fs.readFileSync(paths.templatesVersao[1], 'utf-8');

  // Segunda execução: v=5 → v=5 (sem mudança)
  const r2 = atualizarVersao(paths, '5');
  assert.ok(r2.ok);
  const snapshot2 = {};
  for (const arq of arquivos) {
    snapshot2[arq] = fs.readFileSync(arq, 'utf-8');
  }
  snapshot2[paths.templatesVersao[0]] = fs.readFileSync(paths.templatesVersao[0], 'utf-8');
  snapshot2[paths.templatesVersao[1]] = fs.readFileSync(paths.templatesVersao[1], 'utf-8');

  assert.deepStrictEqual(snapshot1, snapshot2, 'snapshots devem ser idênticos após 2ª execução');
});
