import { describe, expect, test } from "vitest";
import { parseFrontmatter } from "@/lib/blog/frontmatter";

describe("parseFrontmatter", () => {
  test("bloco válido devolve dados e corpo", () => {
    const texto = ["---", "titulo: Home Equity", "categoria: home-equity", "---", "Conteúdo do artigo."].join(
      "\n",
    );
    const resultado = parseFrontmatter(texto);
    expect(resultado.dados).toEqual({ titulo: "Home Equity", categoria: "home-equity" });
    expect(resultado.corpo).toBe("Conteúdo do artigo.");
  });

  test("valor entre aspas tem as aspas removidas", () => {
    const texto = ['---', 'titulo: "Como funciona o Home Equity"', '---', 'corpo'].join("\n");
    const resultado = parseFrontmatter(texto);
    expect(resultado.dados.titulo).toBe("Como funciona o Home Equity");
  });

  test("CRLF é normalizado", () => {
    const texto = "---\r\ntitulo: Consórcio\r\n---\r\nLinha um\r\nLinha dois";
    const resultado = parseFrontmatter(texto);
    expect(resultado.dados).toEqual({ titulo: "Consórcio" });
    expect(resultado.corpo).toBe("Linha um\nLinha dois");
  });

  test("linhas em branco dentro do bloco são ignoradas", () => {
    const texto = ["---", "titulo: Imóveis", "", "categoria: imoveis", "---", "corpo"].join("\n");
    const resultado = parseFrontmatter(texto);
    expect(resultado.dados).toEqual({ titulo: "Imóveis", categoria: "imoveis" });
  });

  test("corpo tem as quebras iniciais removidas", () => {
    const texto = ["---", "titulo: Financiamento", "---", "", "", "Primeira linha do corpo."].join("\n");
    const resultado = parseFrontmatter(texto);
    expect(resultado.corpo).toBe("Primeira linha do corpo.");
  });

  test("lança quando o arquivo não começa com ---", () => {
    const texto = ["titulo: Financiamento", "---", "corpo"].join("\n");
    expect(() => parseFrontmatter(texto)).toThrow(
      'Frontmatter ausente: o arquivo precisa começar com "---".',
    );
  });

  test("lança quando falta o --- de fechamento", () => {
    const texto = ["---", "titulo: Financiamento", "corpo sem fechamento"].join("\n");
    expect(() => parseFrontmatter(texto)).toThrow(
      'Frontmatter não fechado: falta o "---" de fechamento.',
    );
  });

  test("lança quando uma linha do bloco não casa chave: valor", () => {
    const texto = ["---", "isso não é uma chave válida", "---", "corpo"].join("\n");
    expect(() => parseFrontmatter(texto)).toThrow(/Linha de frontmatter inválida/);
  });
});
