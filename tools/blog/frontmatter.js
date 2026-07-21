/* Parser do frontmatter dos artigos do blog (content/blog/*.md).
 * Formato: bloco delimitado por linhas "---", pares "chave: valor" simples
 * (uma linha por campo, sem aninhamento). Valores entre aspas podem conter
 * ":" ou "#"; valores sem aspas aceitam comentário inline a partir de " #".
 */

function parseValor(bruto) {
  let v = bruto.trim();
  if (v.startsWith('"')) {
    const fechamento = v.indexOf('"', 1);
    return fechamento !== -1 ? v.slice(1, fechamento) : v.slice(1);
  }
  const idxComentario = v.indexOf(' #');
  v = idxComentario !== -1 ? v.slice(0, idxComentario).trim() : v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function parseFrontmatter(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  if (linhas[0].trim() !== '---') {
    throw new Error('frontmatter ausente: o arquivo deve começar com "---"');
  }
  let fim = -1;
  for (let i = 1; i < linhas.length; i++) {
    if (linhas[i].trim() === '---') { fim = i; break; }
  }
  if (fim === -1) {
    throw new Error('frontmatter não fechado: falta o "---" de fechamento');
  }
  const dados = {};
  for (const linha of linhas.slice(1, fim)) {
    if (!linha.trim()) continue;
    const m = linha.match(/^([a-zA-Z_][\w]*):\s*(.*)$/);
    if (!m) throw new Error(`linha de frontmatter inválida: "${linha}"`);
    dados[m[1]] = parseValor(m[2]);
  }
  const corpo = linhas.slice(fim + 1).join('\n').replace(/^\n+/, '');
  return { dados, corpo };
}

module.exports = { parseFrontmatter };
