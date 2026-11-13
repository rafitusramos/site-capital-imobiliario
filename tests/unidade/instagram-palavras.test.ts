import { describe, it, expect } from "vitest";
import { casaPalavras, normalizar } from "@/lib/instagram/palavras";

describe("normalizar", () => {
  it("remove acentos e baixa caixa", () => {
    expect(normalizar("Simulação")).toBe("simulacao");
  });
});

describe("casaPalavras", () => {
  it("casa palavra inteira ignorando caixa e pontuação", () => {
    expect(casaPalavras("Quero AVALIAR!!", ["avaliar"])).toBe(true);
  });
  it("não casa dentro de outra palavra", () => {
    expect(casaPalavras("reavaliar", ["avaliar"])).toBe(false);
  });
  it("ignora acentos", () => {
    expect(casaPalavras("simulação já", ["simulacao"])).toBe(true);
  });
  it("expressão com várias palavras casa em sequência", () => {
    expect(casaPalavras("quero simular agora", ["quero simular"])).toBe(true);
    expect(casaPalavras("simular quero", ["quero simular"])).toBe(false);
  });
  it("ignora emojis", () => {
    expect(casaPalavras("🔥 Avaliar 🔥", ["avaliar"])).toBe(true);
  });
  it("null ou lista vazia casa qualquer comentário", () => {
    expect(casaPalavras("qualquer coisa", null)).toBe(true);
    expect(casaPalavras("qualquer coisa", [])).toBe(true);
  });
  it("comentário vazio não casa", () => {
    expect(casaPalavras("", ["avaliar"])).toBe(false);
  });
});
