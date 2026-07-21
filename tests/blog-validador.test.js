/* Testes do motor de validação do blog (node --test).
 * Cobre o item 4.1 da ESPECIFICACAO-ADMIN-BLOG.md: blog:validar reprova
 * slug duplicado, categoria inválida, data fora de dd-mm-yyyy e dois destaque:true.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseFrontmatter } = require('../tools/blog/frontmatter');
const { validarTudo } = require('../tools/blog/validador');

function pastaTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'blog-teste-'));
}

function artigoValido(overrides = {}) {
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

function escrever(pasta, nomeArquivo, conteudo) {
  fs.writeFileSync(path.join(pasta, nomeArquivo), conteudo, 'utf-8');
}

test('artigo válido não gera erros', () => {
  const pasta = pastaTemporaria();
  escrever(pasta, 'artigo-teste.md', artigoValido());
  const { erros } = validarTudo(pasta);
  assert.deepStrictEqual(erros, []);
});

test('reprova campo obrigatório ausente', () => {
  const pasta = pastaTemporaria();
  const semResumo = artigoValido().replace(/resumo: .*\n/, '');
  escrever(pasta, 'artigo-teste.md', semResumo);
  const { erros } = validarTudo(pasta);
  assert.ok(erros.some(e => /campo obrigatório ausente "resumo"/.test(e)), erros.join('\n'));
});

test('reprova slug duplicado entre dois arquivos', () => {
  const pasta = pastaTemporaria();
  escrever(pasta, 'materia-um.md', artigoValido({ slug: 'mesmo-slug' }));
  escrever(pasta, 'materia-dois.md', artigoValido({ slug: 'mesmo-slug' }));
  const { erros } = validarTudo(pasta);
  assert.ok(erros.some(e => /slug duplicado "mesmo-slug"/.test(e)), erros.join('\n'));
});

test('reprova categoria inválida', () => {
  const pasta = pastaTemporaria();
  escrever(pasta, 'artigo-teste.md', artigoValido({ categoria: 'Categoria Inexistente' }));
  const { erros } = validarTudo(pasta);
  assert.ok(erros.some(e => /categoria inválida "Categoria Inexistente"/.test(e)), erros.join('\n'));
});

test('reprova data fora do formato dd-mm-yyyy', () => {
  const pasta = pastaTemporaria();
  escrever(pasta, 'artigo-teste.md', artigoValido({ data: '2026-01-01' }));
  const { erros } = validarTudo(pasta);
  assert.ok(erros.some(e => /data fora do formato dd-mm-yyyy/.test(e)), erros.join('\n'));
});

test('reprova data calendário inválida (dd-mm-yyyy mas dia inexistente)', () => {
  const pasta = pastaTemporaria();
  escrever(pasta, 'artigo-teste.md', artigoValido({ data: '31-04-2026' }));
  const { erros } = validarTudo(pasta);
  assert.ok(erros.some(e => /data fora do formato dd-mm-yyyy/.test(e)), erros.join('\n'));
});

test('reprova dois artigos com destaque:true', () => {
  const pasta = pastaTemporaria();
  escrever(pasta, 'materia-um.md', artigoValido({ slug: 'materia-um', destaque: 'true' }));
  escrever(pasta, 'materia-dois.md', artigoValido({ slug: 'materia-dois', destaque: 'true' }));
  const { erros } = validarTudo(pasta);
  assert.ok(erros.some(e => /mais de um artigo com destaque:true/.test(e)), erros.join('\n'));
});

test('avisa (não reprova) imagem referenciada inexistente', () => {
  const pastaContent = pastaTemporaria();
  const pastaDist = pastaTemporaria();
  escrever(pastaContent, 'artigo-teste.md', artigoValido({ imagem: '/images/blog/nao-existe.jpg' }));
  const { erros, avisos } = validarTudo(pastaContent, pastaDist);
  assert.deepStrictEqual(erros, []);
  assert.ok(avisos.some(a => /imagem referenciada não encontrada/.test(a)), avisos.join('\n'));
});

test('parseFrontmatter lê o artigo real do repositório sem erros e com schema completo', () => {
  const caminho = path.join(__dirname, '..', 'content', 'blog', 'home-equity-empresario-capital-de-giro.md');
  const texto = fs.readFileSync(caminho, 'utf-8');
  const { dados, corpo } = parseFrontmatter(texto);
  assert.strictEqual(dados.slug, 'home-equity-empresario-capital-de-giro');
  assert.strictEqual(dados.categoria, 'Home Equity');
  assert.strictEqual(dados.data, '21-07-2026');
  assert.strictEqual(dados.destaque, true);
  assert.ok(corpo.startsWith('# Home Equity'));
});

test('blog:validar (CLI) passa limpo sobre o content/blog real do repositório', () => {
  const cli = path.join(__dirname, '..', 'tools', 'blog', 'cli-validar.js');
  const saida = execFileSync(process.execPath, [cli], { encoding: 'utf-8' });
  assert.ok(/^OK: /.test(saida.trim()), saida);
});
