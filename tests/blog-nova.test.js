/* Testes de criação de novo artigo (node --test).
 * Cobre slugify, formatação de data, sugestões, carregamento de mapa, montagem de conteúdo
 * e criação de artigo com validação imediata.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { slugify } = require('../tools/blog/slugify');
const {
  dataHojeDDMMYYYY,
  sugerirCtaPagina,
  sugerirImagem,
  carregarMapaCategorias,
  montarConteudoArtigo,
  criarArtigo
} = require('../tools/blog/novo-artigo');
const { parseFrontmatter } = require('../tools/blog/frontmatter');
const { validarArtigo, validarTudo, CATEGORIAS_VALIDAS } = require('../tools/blog/validador');

const RAIZ = path.join(__dirname, '..');

function pastaTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'blog-nova-teste-'));
}

test('slugify: converte acentos, espaços e maiúsculas em kebab-case', () => {
  assert.strictEqual(slugify('Meu Artigo'), 'meu-artigo');
  assert.strictEqual(slugify('São Paulo'), 'sao-paulo');
  assert.strictEqual(slugify('Café com Açúcar'), 'cafe-com-acucar');
  assert.strictEqual(slugify('HOME EQUITY'), 'home-equity');
  assert.strictEqual(slugify('Imóvel & Crédito'), 'imovel-credito');
  assert.strictEqual(slugify('  Espaços   Múltiplos  '), 'espacos-multiplos');
  assert.strictEqual(slugify('Ponto.Final!!!'), 'pontofinal');
});

test('dataHojeDDMMYYYY: formata com zero-padding e data injetada', () => {
  // Usa Date(year, month, day) que cria na timezone local, sem ambiguidade
  const data1 = new Date(2026, 1, 5); // 5 de fevereiro de 2026
  assert.strictEqual(dataHojeDDMMYYYY(data1), '05-02-2026');

  const data2 = new Date(2026, 11, 31); // 31 de dezembro de 2026
  assert.strictEqual(dataHojeDDMMYYYY(data2), '31-12-2026');

  const data3 = new Date(2026, 0, 1); // 1º de janeiro de 2026
  assert.strictEqual(dataHojeDDMMYYYY(data3), '01-01-2026');
});

test('carregarMapaCategorias: lê do template real e valida sincronia com CATEGORIAS_VALIDAS', () => {
  const caminhoPostsJs = path.join(RAIZ, 'tools', 'templates', 'posts.js');
  const mapa = carregarMapaCategorias(caminhoPostsJs);

  // Verifica que todas as categorias do validador estão no mapa
  for (const cat of CATEGORIAS_VALIDAS) {
    assert.ok(mapa[cat], `categoria "${cat}" deve estar em BLOG_CATEGORIAS`);
    assert.ok(mapa[cat].cor, `categoria "${cat}" deve ter cor definida`);
    assert.ok(mapa[cat].lp, `categoria "${cat}" deve ter LP definida`);
  }

  // Verifica que o mapa tem exatamente as categorias esperadas
  const chavasDoMapa = Object.keys(mapa).sort();
  const categoriasEsperadas = Array.from(CATEGORIAS_VALIDAS).sort();
  assert.deepStrictEqual(chavasDoMapa, categoriasEsperadas);
});

test('sugerirCtaPagina: retorna LP da categoria ou "/" fallback', () => {
  const mapa = {
    'Financiamento': { lp: '/financiamento/', cor: '#123' },
    'Home Equity': { lp: '/home_equity/', cor: '#456' }
  };

  assert.strictEqual(sugerirCtaPagina('Financiamento', mapa), '/financiamento/');
  assert.strictEqual(sugerirCtaPagina('Home Equity', mapa), '/home_equity/');
  assert.strictEqual(sugerirCtaPagina('Inexistente', mapa), '/');
  assert.strictEqual(sugerirCtaPagina('Novo', {}), '/');
});

test('sugerirImagem: gera path padrão /images/blog/{slug}.jpg', () => {
  assert.strictEqual(sugerirImagem('meu-artigo'), '/images/blog/meu-artigo.jpg');
  assert.strictEqual(sugerirImagem('home-equity-2026'), '/images/blog/home-equity-2026.jpg');
});

test('montarConteudoArtigo: gera frontmatter + H1 + esqueleto do corpo', () => {
  const dados = {
    titulo: 'Teste de Artigo',
    slug: 'teste-artigo',
    metaTitulo: 'Teste de Artigo | Meta',
    metaDescricao: 'Descrição para buscadores.',
    categoria: 'Financiamento',
    ctaPagina: '/financiamento/',
    rotulo: 'Financiamento',
    data: '15-07-2026',
    resumo: 'Resumo breve.',
    imagem: '/images/blog/teste-artigo.jpg',
    destaque: false
  };

  const conteudo = montarConteudoArtigo(dados);

  // Valida que é um frontmatter válido
  const { dados: dadosParsed, corpo } = parseFrontmatter(conteudo);
  assert.deepStrictEqual(dadosParsed, {
    titulo: 'Teste de Artigo',
    slug: 'teste-artigo',
    meta_titulo: 'Teste de Artigo | Meta',
    meta_descricao: 'Descrição para buscadores.',
    categoria: 'Financiamento',
    cta_pagina: '/financiamento/',
    rotulo: 'Financiamento',
    data: '15-07-2026',
    resumo: 'Resumo breve.',
    imagem: '/images/blog/teste-artigo.jpg',
    destaque: false
  });

  // Valida que o corpo começa com H1 esperado
  assert.ok(corpo.trim().startsWith('# Teste de Artigo'));

  // Valida que não há erros de validação do artigo
  const erros = validarArtigo(dadosParsed, 'montarConteudoArtigo-teste');
  assert.strictEqual(erros.length, 0, `montarConteudoArtigo deve produzir artigo válido, obteve: ${erros.join('; ')}`);
});

test('criarArtigo: grava arquivo e recusa sobrescrever slug existente', () => {
  const temp = pastaTemporaria();
  const dados = {
    titulo: 'Novo Artigo',
    slug: 'novo-artigo',
    metaTitulo: 'Novo Artigo',
    metaDescricao: 'Descrição',
    categoria: 'Home Equity',
    ctaPagina: '/home_equity/',
    rotulo: 'Home Equity',
    data: '01-07-2026',
    resumo: 'Resumo',
    imagem: '/images/blog/novo-artigo.jpg',
    destaque: false
  };

  // Primeira criação: sucesso
  criarArtigo(temp, dados);
  const caminhoMd = path.join(temp, 'novo-artigo.md');
  assert.ok(fs.existsSync(caminhoMd), 'arquivo deve existir');

  const conteudo = fs.readFileSync(caminhoMd, 'utf-8');
  assert.ok(conteudo.includes('slug: novo-artigo'), 'slug deve estar no conteúdo');
  assert.ok(conteudo.includes('# Novo Artigo'), 'H1 deve estar no conteúdo');

  // Segunda criação: deve falhar
  assert.throws(
    () => criarArtigo(temp, dados),
    Error,
    'deve rejeitar slug duplicado'
  );
});

test('integração: artigo recém-criado passa por validarTudo com só aviso de imagem (se aplicável)', () => {
  const temp = pastaTemporaria();
  const pastaContent = temp;

  const dados = {
    titulo: 'Integração Test',
    slug: 'integracao-test',
    metaTitulo: 'Integração Test',
    metaDescricao: 'Teste de integração.',
    categoria: 'Consórcio',
    ctaPagina: '/',
    rotulo: 'Consórcio',
    data: '20-06-2026',
    resumo: 'Resumo de teste.',
    imagem: '/images/blog/integracao-test.jpg',
    destaque: false
  };

  criarArtigo(pastaContent, dados);

  const pastaDist = pastaTemporaria();
  const { erros, avisos } = validarTudo(pastaContent, pastaDist);

  // Não deve haver erros (exceto potencial aviso de imagem ausente em dist)
  assert.strictEqual(
    erros.length,
    0,
    `validarTudo deve passar sem erros, obteve: ${erros.join('; ')}`
  );

  // Pode haver aviso de imagem (é esperado em teste sem copiar imagens para dist)
  const avisoImagem = avisos.find(a => a.includes('imagem referenciada não encontrada'));
  if (avisoImagem) {
    assert.ok(avisoImagem.includes('integracao-test'));
  }
});
