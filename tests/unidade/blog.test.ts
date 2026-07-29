import { describe, expect, test } from "vitest";
import { corCategoria, ctaDoArtigo, dividirConteudo, formatarData } from "@/lib/blog/blog";

describe("corCategoria", () => {
  test("cada slug conhecido devolve a variável de cor certa", () => {
    expect(corCategoria("financiamento")).toBe("var(--jade)");
    expect(corCategoria("home-equity")).toBe("var(--jade)");
    expect(corCategoria("consorcio")).toBe("var(--bronze)");
    expect(corCategoria("imoveis")).toBe("var(--abissal)");
  });

  test("slug desconhecido devolve a cor padrão", () => {
    expect(corCategoria("categoria-inexistente")).toBe("var(--areia)");
  });

  test("null ou undefined devolve a cor padrão", () => {
    expect(corCategoria(null)).toBe("var(--areia)");
    expect(corCategoria(undefined)).toBe("var(--areia)");
  });
});

describe("ctaDoArtigo", () => {
  test("Financiamento gera título e botão com o rótulo minúsculo", () => {
    expect(ctaDoArtigo("Financiamento")).toEqual({
      titulo: "Vale simular o seu financiamento?",
      botao: "Simular meu financiamento →",
    });
  });

  test("Home Equity gera título e botão com o rótulo minúsculo", () => {
    expect(ctaDoArtigo("Home Equity")).toEqual({
      titulo: "Vale simular o seu home equity?",
      botao: "Simular meu home equity →",
    });
  });

  test("Consórcio gera título e botão com o rótulo minúsculo", () => {
    expect(ctaDoArtigo("Consórcio")).toEqual({
      titulo: "Vale simular o seu consórcio?",
      botao: "Simular meu consórcio →",
    });
  });

  test("categoria desconhecida cai no texto genérico", () => {
    expect(ctaDoArtigo("Imóveis")).toEqual({
      titulo: "Vale conhecer nossas soluções de crédito?",
      botao: "Conhecer as soluções →",
    });
  });

  test("null cai no texto genérico", () => {
    expect(ctaDoArtigo(null)).toEqual({
      titulo: "Vale conhecer nossas soluções de crédito?",
      botao: "Conhecer as soluções →",
    });
  });
});

describe("dividirConteudo", () => {
  test("descarta o '# Título' inicial", () => {
    const { primeiroParagrafo } = dividirConteudo(
      "# Título\n\nPrimeiro parágrafo aqui.\n\nSegundo parágrafo aqui.",
    );
    expect(primeiroParagrafo).toBe("Primeiro parágrafo aqui.");
  });

  test("separa o primeiro parágrafo do restante", () => {
    const resultado = dividirConteudo(
      "# Título\n\nPrimeiro parágrafo aqui.\n\nSegundo parágrafo aqui.",
    );
    expect(resultado).toEqual({
      primeiroParagrafo: "Primeiro parágrafo aqui.",
      restante: "Segundo parágrafo aqui.",
    });
  });

  test("conteúdo de parágrafo único devolve restante vazio", () => {
    const resultado = dividirConteudo("# Título\n\nSó um parágrafo sem mais nada.");
    expect(resultado).toEqual({
      primeiroParagrafo: "Só um parágrafo sem mais nada.",
      restante: "",
    });
  });

  test("linha divisória logo no início do restante é descartada", () => {
    const resultado = dividirConteudo(
      "# Título\n\nPrimeiro parágrafo.\n\n---\n\nConteúdo depois da linha divisória.",
    );
    expect(resultado).toEqual({
      primeiroParagrafo: "Primeiro parágrafo.",
      restante: "Conteúdo depois da linha divisória.",
    });
  });

  test("bloco de código cercado com linha em branco dentro chega intacto ao restante", () => {
    const conteudo =
      "# Título\n\nPrimeiro parágrafo.\n\n```js\nfunction foo() {\n\n  return 1;\n}\n```";
    const resultado = dividirConteudo(conteudo);
    expect(resultado.restante).toBe(
      "```js\nfunction foo() {\n\n  return 1;\n}\n```",
    );
  });
});

describe("formatarData", () => {
  test("null devolve string vazia", () => {
    expect(formatarData(null)).toBe("");
  });

  test("ISO simples vira DD-MM-AAAA", () => {
    expect(formatarData("2024-06-15T12:00:00Z")).toBe("15-06-2024");
  });

  test("fronteira de fuso: instante UTC que cai no dia anterior em São Paulo", () => {
    expect(formatarData("2024-03-11T02:00:00Z")).toBe("10-03-2024");
  });
});
