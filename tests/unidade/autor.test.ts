import { describe, expect, test } from "vitest";
import { AUTOR, DESCRICAO_SOBRE, resumoDoAutor } from "@/lib/autor";

describe("autor", () => {
  test("a meta description de /sobre/ segue idêntica, caractere por caractere", () => {
    expect(DESCRICAO_SOBRE).toBe(
      "Rafael Teixeira: corretor de imóveis (CRECI-SP) e correspondente bancário especializado em crédito com garantia de imóvel, financiamento SBPE e consórcio. Certificação FEBRABAN CA-600.",
    );
  });

  test("o resumo da caixa é a descrição sem o nome repetido, sem reescrever o texto", () => {
    expect(resumoDoAutor()).toBe(
      "Corretor de imóveis (CRECI-SP) e correspondente bancário especializado em crédito com garantia de imóvel, financiamento SBPE e consórcio. Certificação FEBRABAN CA-600.",
    );
    expect(DESCRICAO_SOBRE.endsWith(resumoDoAutor().slice(1))).toBe(true);
  });

  test("sem dois-pontos devolve o texto inteiro", () => {
    expect(resumoDoAutor("Texto sem prefixo.")).toBe("Texto sem prefixo.");
  });

  test("dados fixos do autor", () => {
    expect(AUTOR.nome).toBe("Rafael Teixeira");
    expect(AUTOR.url).toBe("/sobre/");
    expect(AUTOR.foto).toBe("/images/rafael-teixeira.jpg");
    expect(AUTOR.registro).toBe("CRECI-SP 283020-F");
  });
});
