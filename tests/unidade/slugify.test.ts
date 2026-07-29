import { describe, expect, test } from "vitest";
import { slugify } from "@/lib/blog/slugify";

describe("slugify", () => {
  test("remove acentos e troca espaços por hífens", () => {
    expect(slugify("Home Equity para Empresário")).toBe("home-equity-para-empresario");
  });

  test("converte maiúsculas para minúsculas", () => {
    expect(slugify("FINANCIAMENTO IMOBILIÁRIO")).toBe("financiamento-imobiliario");
  });

  test("descarta pontuação", () => {
    expect(slugify("Dúvidas? Sobre o Home Equity!")).toBe("duvidas-sobre-o-home-equity");
  });

  test("espaços múltiplos viram um único hífen", () => {
    expect(slugify("consórcio   de   imóveis")).toBe("consorcio-de-imoveis");
  });

  test("remove hífens nas pontas", () => {
    expect(slugify("  -Melhor Taxa-  ")).toBe("melhor-taxa");
  });

  test("string vazia devolve string vazia", () => {
    expect(slugify("")).toBe("");
  });
});
