import { describe, expect, test } from "vitest";
import { decimalParaPercentual, percentualParaDecimal } from "@/lib/parametros/taxa";

describe("percentualParaDecimal", () => {
  test("11,5% ao ano vira 0.115", () => {
    expect(percentualParaDecimal(11.5)).toBe(0.115);
  });

  test("1,09% ao mês vira 0.0109", () => {
    expect(percentualParaDecimal(1.09)).toBe(0.0109);
  });

  test("não deixa lixo de ponto flutuante (19.9 / 100 puro dá 0.19899999999999998)", () => {
    // Sem o arredondamento em percentualParaDecimal, 19.9 / 100 em JS puro
    // resulta em 0.19899999999999998 — exatamente a armadilha que a função
    // existe para evitar.
    expect(19.9 / 100).not.toBe(0.199);
    expect(percentualParaDecimal(19.9)).toBe(0.199);
  });

  test("zero permanece zero", () => {
    expect(percentualParaDecimal(0)).toBe(0);
  });
});

describe("decimalParaPercentual", () => {
  test("0.115 vira 11.5", () => {
    expect(decimalParaPercentual(0.115)).toBe(11.5);
  });

  test("0.0109 vira 1.09", () => {
    expect(decimalParaPercentual(0.0109)).toBe(1.09);
  });

  test("zero permanece zero", () => {
    expect(decimalParaPercentual(0)).toBe(0);
  });
});

describe("ida e volta", () => {
  test("percentualParaDecimal seguido de decimalParaPercentual devolve o valor original", () => {
    expect(decimalParaPercentual(percentualParaDecimal(11.5))).toBe(11.5);
    expect(decimalParaPercentual(percentualParaDecimal(1.09))).toBe(1.09);
    expect(decimalParaPercentual(percentualParaDecimal(0.5))).toBe(0.5);
  });
});
