import { describe, expect, test } from "vitest";
import { automacaoSchema } from "@/lib/validations/instagram";
import { TEXTOS_PADRAO } from "@/lib/instagram/textos-padrao";

function valida(extra: Record<string, unknown> = {}) {
  return {
    nome: "Lançamento Jabô",
    alvo: "qualquer",
    midiaId: null,
    palavras: ["quero"],
    responderPublico: true,
    frasesPublicas: ["Te mandei no privado!"],
    dm1Texto: "Oi! Toca no botão para receber o link.",
    dm1Botao: "Quero o link",
    exigirSeguir: false,
    seguirTexto: TEXTOS_PADRAO.seguirTexto,
    seguirBotao: TEXTOS_PADRAO.seguirBotao,
    seguirInsisteTexto: TEXTOS_PADRAO.seguirInsisteTexto,
    linkTexto: "Aqui está o link:",
    linkBotao: "Abrir",
    linkUrl: "https://rtcapitalimobiliario.com.br/imoveis/jabo/",
    lembreteAtivo: true,
    lembreteHoras: 2,
    lembreteTexto: TEXTOS_PADRAO.lembreteTexto,
    retomadaBotaoTexto: TEXTOS_PADRAO.retomadaBotaoTexto,
    retomadaSeguirTexto: TEXTOS_PADRAO.retomadaSeguirTexto,
    retomadaLinkTexto: TEXTOS_PADRAO.retomadaLinkTexto,
    ...extra,
  };
}

describe("automacaoSchema", () => {
  test("aceita uma automação completa", () => {
    expect(automacaoSchema.safeParse(valida()).success).toBe(true);
  });

  test("aceita palavras null (qualquer palavra)", () => {
    expect(automacaoSchema.safeParse(valida({ palavras: null })).success).toBe(true);
  });

  test("rejeita lista de palavras vazia", () => {
    expect(automacaoSchema.safeParse(valida({ palavras: [] })).success).toBe(false);
  });

  test("rejeita palavra com mais de 40 caracteres", () => {
    expect(automacaoSchema.safeParse(valida({ palavras: ["a".repeat(41)] })).success).toBe(false);
  });

  test("rejeita título de botão com 21 caracteres e aceita 20", () => {
    expect(automacaoSchema.safeParse(valida({ dm1Botao: "a".repeat(21) })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ dm1Botao: "a".repeat(20) })).success).toBe(true);
    expect(automacaoSchema.safeParse(valida({ linkBotao: "" })).success).toBe(false);
  });

  test("rejeita lembreteHoras 24 e 0, aceita 1 e 23", () => {
    expect(automacaoSchema.safeParse(valida({ lembreteHoras: 24 })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ lembreteHoras: 0 })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ lembreteHoras: 1 })).success).toBe(true);
    expect(automacaoSchema.safeParse(valida({ lembreteHoras: 23 })).success).toBe(true);
    expect(automacaoSchema.safeParse(valida({ lembreteHoras: 1.5 })).success).toBe(false);
  });

  test("especifica exige midiaId", () => {
    expect(automacaoSchema.safeParse(valida({ alvo: "especifica", midiaId: null })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ alvo: "especifica", midiaId: "123" })).success).toBe(true);
  });

  test("rejeita link http://", () => {
    expect(automacaoSchema.safeParse(valida({ linkUrl: "http://exemplo.com" })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ linkUrl: "exemplo.com" })).success).toBe(false);
  });

  test("texto com botão acima de 640 caracteres é rejeitado", () => {
    expect(automacaoSchema.safeParse(valida({ dm1Texto: "a".repeat(641) })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ dm1Texto: "a".repeat(640) })).success).toBe(true);
  });

  test("responderPublico exige ao menos uma frase de até 300 caracteres", () => {
    expect(automacaoSchema.safeParse(valida({ frasesPublicas: [] })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ frasesPublicas: ["a".repeat(301)] })).success).toBe(false);
    expect(
      automacaoSchema.safeParse(valida({ responderPublico: false, frasesPublicas: [] })).success,
    ).toBe(true);
  });

  test("textos de retomada, seguir e lembrete são obrigatórios", () => {
    expect(automacaoSchema.safeParse(valida({ retomadaLinkTexto: "" })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ seguirTexto: "" })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ lembreteTexto: "" })).success).toBe(false);
  });

  test("nome vazio ou acima de 80 é rejeitado", () => {
    expect(automacaoSchema.safeParse(valida({ nome: "" })).success).toBe(false);
    expect(automacaoSchema.safeParse(valida({ nome: "a".repeat(81) })).success).toBe(false);
  });
});
