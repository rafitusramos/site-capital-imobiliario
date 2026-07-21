/* Validador do schema dos artigos do blog (content/blog/*.md).
 * Usado por `npm run blog:validar` e pelos testes em tests/blog-validador.test.js.
 */
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

const CAMPOS_OBRIGATORIOS = [
  'titulo', 'slug', 'meta_titulo', 'meta_descricao', 'categoria', 'cta_pagina',
  'rotulo', 'data', 'resumo', 'imagem', 'destaque'
];
const CATEGORIAS_VALIDAS = ['Financiamento', 'Home Equity', 'Consórcio', 'Imóveis'];
const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RE_DATA = /^(\d{2})-(\d{2})-(\d{4})$/;

function dataValida(str) {
  const m = String(str).match(RE_DATA);
  if (!m) return false;
  const dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);
  if (mes < 1 || mes > 12) return false;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  return dia >= 1 && dia <= diasNoMes;
}

function validarArtigo(dados, origem) {
  const erros = [];
  for (const campo of CAMPOS_OBRIGATORIOS) {
    if (dados[campo] === undefined || dados[campo] === '') {
      erros.push(`${origem}: campo obrigatório ausente "${campo}"`);
    }
  }
  if (dados.slug !== undefined && !RE_SLUG.test(dados.slug)) {
    erros.push(`${origem}: slug fora do padrão kebab-case: "${dados.slug}"`);
  }
  if (dados.categoria !== undefined && !CATEGORIAS_VALIDAS.includes(dados.categoria)) {
    erros.push(`${origem}: categoria inválida "${dados.categoria}" (válidas: ${CATEGORIAS_VALIDAS.join(' | ')})`);
  }
  if (dados.data !== undefined && !dataValida(dados.data)) {
    erros.push(`${origem}: data fora do formato dd-mm-yyyy ou inválida: "${dados.data}"`);
  }
  if (dados.destaque !== undefined && typeof dados.destaque !== 'boolean') {
    erros.push(`${origem}: campo "destaque" deve ser true ou false, obtido "${dados.destaque}"`);
  }
  return erros;
}

function validarTudo(pastaContentBlog, pastaDist) {
  const erros = [];
  const avisos = [];
  const arquivos = fs.readdirSync(pastaContentBlog).filter(f => f.endsWith('.md'));
  const porSlug = new Map();
  const destaques = [];

  for (const arquivo of arquivos) {
    const caminho = path.join(pastaContentBlog, arquivo);
    const texto = fs.readFileSync(caminho, 'utf-8');
    let dados;
    try {
      ({ dados } = parseFrontmatter(texto));
    } catch (e) {
      erros.push(`${arquivo}: ${e.message}`);
      continue;
    }

    erros.push(...validarArtigo(dados, arquivo));

    const slugEsperado = arquivo.replace(/\.md$/, '');
    if (dados.slug && dados.slug !== slugEsperado) {
      erros.push(`${arquivo}: slug "${dados.slug}" não bate com o nome do arquivo (esperado "${slugEsperado}")`);
    }
    if (dados.slug) {
      if (!porSlug.has(dados.slug)) porSlug.set(dados.slug, []);
      porSlug.get(dados.slug).push(arquivo);
    }
    if (dados.destaque === true) destaques.push(arquivo);

    if (dados.imagem && pastaDist) {
      const caminhoImagem = path.join(pastaDist, dados.imagem.replace(/^\//, ''));
      if (!fs.existsSync(caminhoImagem)) {
        avisos.push(`${arquivo}: imagem referenciada não encontrada: ${dados.imagem}`);
      }
    }
  }

  for (const [slug, arquivosComSlug] of porSlug) {
    if (arquivosComSlug.length > 1) {
      erros.push(`slug duplicado "${slug}": ${arquivosComSlug.join(', ')}`);
    }
  }

  if (destaques.length > 1) {
    erros.push(`mais de um artigo com destaque:true: ${destaques.join(', ')}`);
  }

  return { erros, avisos };
}

module.exports = { validarArtigo, validarTudo, dataValida, CAMPOS_OBRIGATORIOS, CATEGORIAS_VALIDAS };
