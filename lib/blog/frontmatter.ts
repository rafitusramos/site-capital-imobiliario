// Parser mínimo de frontmatter para o modelo em docs/modelo-artigo.md — porta a
// mesma ideia de tools/blog/frontmatter.js (CommonJS, fora do build do Next)
// para TypeScript. Formato: bloco delimitado por linhas "---", pares
// "chave: valor" simples (uma linha por campo, sem aninhamento).

export interface ArtigoFrontmatter {
  dados: Record<string, string>;
  corpo: string;
}

function parseValor(bruto: string): string {
  const v = bruto.trim();
  if (v.startsWith('"')) {
    const fechamento = v.indexOf('"', 1);
    return fechamento !== -1 ? v.slice(1, fechamento) : v.slice(1);
  }
  return v;
}

export function parseFrontmatter(texto: string): ArtigoFrontmatter {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  if ((linhas[0] ?? "").trim() !== "---") {
    throw new Error('Frontmatter ausente: o arquivo precisa começar com "---".');
  }

  let fim = -1;
  for (let i = 1; i < linhas.length; i++) {
    if (linhas[i].trim() === "---") {
      fim = i;
      break;
    }
  }
  if (fim === -1) {
    throw new Error('Frontmatter não fechado: falta o "---" de fechamento.');
  }

  const dados: Record<string, string> = {};
  for (const linha of linhas.slice(1, fim)) {
    if (!linha.trim()) continue;
    const m = linha.match(/^([a-zA-Z_][\w]*):\s*(.*)$/);
    if (!m) throw new Error(`Linha de frontmatter inválida: "${linha}"`);
    dados[m[1]] = parseValor(m[2]);
  }

  const corpo = linhas
    .slice(fim + 1)
    .join("\n")
    .replace(/^\n+/, "");

  return { dados, corpo };
}
