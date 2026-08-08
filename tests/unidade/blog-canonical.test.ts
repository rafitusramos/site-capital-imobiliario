import { describe, expect, test } from "vitest";
import { canonicalDoArtigo } from "@/lib/blog/blog";

/**
 * Invariante de indexação: toda página de artigo sai com canonical.
 *
 * A regressão que este arquivo tranca: `canonical_url` é coluna opcional
 * (migration 001) sem campo no admin nem no frontmatter, então quase todo
 * post tem `null` ali. Quando o metadata da página usava a coluna direto,
 * num ternário que caía em `undefined`, esses posts eram servidos sem
 * <link rel="canonical"> — e o Search Console reportou "Cópia — Google
 * escolheu canônica diferente".
 */
describe("canonicalDoArtigo", () => {
  test("sem canonical_url, é auto-referenciada e com barra final", () => {
    expect(canonicalDoArtigo(null, "um-artigo")).toBe("/blog/um-artigo/");
  });

  test("com canonical_url preenchida, respeita o valor do banco", () => {
    const doBanco = "https://rtcapitalimobiliario.com.br/blog/um-artigo/";
    expect(canonicalDoArtigo(doBanco, "um-artigo")).toBe(doBanco);
  });

  test("undefined cai na auto-referenciada", () => {
    expect(canonicalDoArtigo(undefined, "um-artigo")).toBe("/blog/um-artigo/");
  });

  test("string vazia ou só espaços não vira canonical vazia", () => {
    expect(canonicalDoArtigo("", "um-artigo")).toBe("/blog/um-artigo/");
    expect(canonicalDoArtigo("   ", "um-artigo")).toBe("/blog/um-artigo/");
  });

  test("nunca devolve valor vazio — é o ponto da função", () => {
    for (const valor of [null, undefined, "", "  "]) {
      expect(canonicalDoArtigo(valor, "seja-qual-for")).toBeTruthy();
    }
  });
});
