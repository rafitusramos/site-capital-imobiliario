#!/usr/bin/env node
/* CLI: npm run blog:nova — cria novo artigo .md interativamente em content/blog/. */
const readline = require('readline/promises');
const path = require('path');
const fs = require('fs');
const { slugify } = require('./slugify');
const {
  dataHojeDDMMYYYY,
  sugerirCtaPagina,
  sugerirImagem,
  carregarMapaCategorias,
  criarArtigo
} = require('./novo-artigo');
const { validarTudo, CATEGORIAS_VALIDAS, RE_SLUG, dataValida } = require('./validador');

const RAIZ = path.join(__dirname, '..', '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('\n=== Novo Artigo do Blog ===\n');

  try {
    // Carrega mapa de categorias
    const mapaCategorias = carregarMapaCategorias(path.join(RAIZ, 'tools', 'templates', 'posts.js'));

    // 1. Título
    const titulo = await rl.question('Título do artigo: ');
    if (!titulo) {
      console.error('ERRO: título não pode ser vazio');
      process.exit(1);
    }

    // 2. Slug (sugerido via slugify, validado)
    const slugSugerido = slugify(titulo);
    let slug = await rl.question(`Slug (padrão: ${slugSugerido}): `);
    slug = slug.trim() || slugSugerido;

    if (!RE_SLUG.test(slug)) {
      console.error(`ERRO: slug "${slug}" não segue padrão kebab-case (letras/números/hífens)`);
      process.exit(1);
    }

    const caminhoMd = path.join(RAIZ, 'content', 'blog', `${slug}.md`);
    if (fs.existsSync(caminhoMd)) {
      console.error(`ERRO: artigo com slug "${slug}" já existe`);
      process.exit(1);
    }

    // 3. Categoria (menu 1-4)
    console.log('\nCategorias:');
    for (let i = 0; i < CATEGORIAS_VALIDAS.length; i++) {
      console.log(`  ${i + 1}. ${CATEGORIAS_VALIDAS[i]}`);
    }
    const opcaoCategoria = await rl.question('Escolha [1-4]: ');
    const indiceCategoria = Number(opcaoCategoria) - 1;
    if (indiceCategoria < 0 || indiceCategoria >= CATEGORIAS_VALIDAS.length) {
      console.error('ERRO: opção inválida');
      process.exit(1);
    }
    const categoria = CATEGORIAS_VALIDAS[indiceCategoria];

    // 4. CTA (default via sugerirCtaPagina)
    const ctaPagSugerida = sugerirCtaPagina(categoria, mapaCategorias);
    const ctaPagina = await rl.question(`CTA página (padrão: ${ctaPagSugerida}): `);
    const ctaPaginaFinal = ctaPagina.trim() || ctaPagSugerida;

    // 5. Meta título (default: "{título} | Capital Imobiliário")
    const metaTituloSugerido = `${titulo} | Capital Imobiliário`;
    const metaTitulo = await rl.question(`Meta título (padrão: ${metaTituloSugerido}): `);
    const metaTituloFinal = metaTitulo.trim() || metaTituloSugerido;

    // 6. Meta descrição
    const metaDescricao = await rl.question('Meta descrição (resumo para buscadores): ');
    if (!metaDescricao.trim()) {
      console.error('ERRO: meta descrição não pode ser vazia');
      process.exit(1);
    }

    // 7. Rótulo (label da categoria)
    const rotulo = await rl.question('Rótulo (tag, ex.: "Home Equity"): ');
    if (!rotulo.trim()) {
      console.error('ERRO: rótulo não pode ser vazio');
      process.exit(1);
    }

    // 8. Resumo (resumo para o índice)
    const resumo = await rl.question('Resumo (para índice do blog): ');
    if (!resumo.trim()) {
      console.error('ERRO: resumo não pode ser vazio');
      process.exit(1);
    }

    // 9. Data (padrão: hoje)
    const dataHoje = dataHojeDDMMYYYY();
    const dataStr = await rl.question(`Data dd-mm-yyyy (padrão: ${dataHoje}): `);
    const dataFinal = dataStr.trim() || dataHoje;
    if (!dataValida(dataFinal)) {
      console.error(`ERRO: data inválida ou fora do formato dd-mm-yyyy: "${dataFinal}"`);
      process.exit(1);
    }

    // 10. Imagem (default via sugerirImagem)
    const imagemSugerida = sugerirImagem(slug);
    const imagem = await rl.question(`Imagem (padrão: ${imagemSugerida}): `);
    const imagemFinal = imagem.trim() || imagemSugerida;

    // 11. Destaque (s/n)
    const destaqueSN = await rl.question('Destaque? (s/n): ');
    const destaque = destaqueSN.toLowerCase() === 's';

    // Avisa se já existe outro destaque
    const pastaContentBlog = path.join(RAIZ, 'content', 'blog');
    if (fs.existsSync(pastaContentBlog)) {
      const { erros } = validarTudo(pastaContentBlog, path.join(RAIZ, 'dist'));
      const erroDestaque = erros.find(e => e.includes('mais de um artigo com destaque'));
      if (destaque && erroDestaque) {
        console.warn('AVISO: já existe outro artigo com destaque:true');
      }
    }

    // Cria o artigo
    criarArtigo(pastaContentBlog, {
      titulo,
      slug,
      metaTitulo: metaTituloFinal,
      metaDescricao: metaDescricao.trim(),
      categoria,
      ctaPagina: ctaPaginaFinal,
      rotulo: rotulo.trim(),
      data: dataFinal,
      resumo: resumo.trim(),
      imagem: imagemFinal,
      destaque
    });

    console.log(`\nOK: artigo criado em content/blog/${slug}.md`);

    // Valida imediatamente
    const { erros, avisos } = validarTudo(pastaContentBlog, path.join(RAIZ, 'dist'));
    for (const aviso of avisos) {
      if (aviso.includes(slug)) {
        console.warn(`AVISO: ${aviso}`);
      }
    }
    for (const erro of erros) {
      if (erro.includes(slug)) {
        console.error(`ERRO: ${erro}`);
      }
    }

    console.log('\nPróximos passos:');
    console.log('  1. Edite o conteúdo em content/blog/' + slug + '.md');
    console.log('  2. Rode: npm run blog:gerar');
    console.log('  3. Rode: npm run blog:validar');

    process.exit(0);
  } catch (e) {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
