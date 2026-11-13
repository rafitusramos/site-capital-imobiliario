import { describe, expect, it } from "vitest";
import {
  adicionarPalavras,
  rankingDePalavras,
  removerPalavra,
  sugerirPalavras,
} from "@/lib/instagram/campo-palavras";

describe("adicionarPalavras", () => {
  it("separa por vírgula e quebra de linha, apara e ignora vazias", () => {
    expect(adicionarPalavras([], " Avaliar,\nsimular ,, \r\n querer ")).toEqual(["Avaliar", "simular", "querer"]);
  });

  it("deduplica sem caixa nem acento e mantém a primeira grafia", () => {
    expect(adicionarPalavras(["Teste"], "teste, Avaliação, avaliacao")).toEqual(["Teste", "Avaliação"]);
  });

  it("texto só de separadores não muda a lista", () => {
    expect(adicionarPalavras(["a"], " , \n ")).toEqual(["a"]);
  });

  it("não altera a lista de entrada", () => {
    const l = ["a"];
    adicionarPalavras(l, "b");
    expect(l).toEqual(["a"]);
  });
});

describe("removerPalavra", () => {
  it("remove pelo índice", () => {
    expect(removerPalavra(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });
  it("índice inválido não muda nada", () => {
    expect(removerPalavra(["a"], 5)).toEqual(["a"]);
    expect(removerPalavra(["a"], -1)).toEqual(["a"]);
  });
});

describe("rankingDePalavras", () => {
  it("ordena por frequência e depois alfabética pt-BR", () => {
    const r = rankingDePalavras([["zebra", "avaliar"], ["avaliar", "água"], ["Zebra"], null]);
    expect(r).toEqual(["avaliar", "zebra", "água"]);
  });

  it("conta pela forma normalizada e mostra a grafia mais frequente", () => {
    const r = rankingDePalavras([["Avaliação"], ["avaliacao"], ["avaliacao"]]);
    expect(r).toEqual(["avaliacao"]);
  });

  it("conta uma vez por automação", () => {
    const r = rankingDePalavras([["a", "A", "b"], ["b"]]);
    expect(r).toEqual(["b", "a"]);
  });

  it("ignora null e vazias", () => {
    expect(rankingDePalavras([null, [], ["  "]])).toEqual([]);
  });
});

describe("sugerirPalavras", () => {
  const ranking = ["simular", "avaliar", "casa avaliada", "valor", "financiar"];

  it("vazio não sugere nada", () => {
    expect(sugerirPalavras(ranking, "  ", [])).toEqual([]);
  });

  it("quem começa vem antes de quem só contém, sem caixa nem acento", () => {
    expect(sugerirPalavras(ranking, "AVAL", [])).toEqual(["avaliar", "casa avaliada"]);
  });

  it("exclui as já escolhidas", () => {
    expect(sugerirPalavras(ranking, "aval", ["Avaliar"])).toEqual(["casa avaliada"]);
  });

  it("respeita o limite", () => {
    expect(sugerirPalavras(ranking, "a", [], 2)).toHaveLength(2);
  });
});
