import { describe, expect, test } from "vitest";
import {
  brl,
  cpfValido,
  digitos,
  parcelaInicialSAC,
  parcelaPrice,
  parseDecimalBr,
  taxaMensal,
  telefoneValido,
} from "@/lib/financeiro";

/**
 * Os valores de referência de parcela e taxa vêm dos números já conferidos
 * contra os simuladores em produção (herdados de tests/financeiro.test.js, do
 * site estático). São fonte de verdade independente da implementação: se a
 * fórmula mudar, o teste tem que reprovar.
 */

describe("digitos", () => {
  test("extrai o número de valores mascarados", () => {
    expect(digitos("R$ 800.000")).toBe(800000);
    expect(digitos("(19) 99783-4187")).toBe(19997834187);
  });

  test("devolve 0 para entrada vazia ou ausente", () => {
    expect(digitos("")).toBe(0);
    expect(digitos(null)).toBe(0);
    expect(digitos(undefined)).toBe(0);
    expect(digitos("sem número")).toBe(0);
  });
});

describe("parseDecimalBr", () => {
  test("aceita vírgula como separador decimal", () => {
    expect(parseDecimalBr("142,5")).toBe(142.5);
  });

  test("aceita ponto como separador decimal", () => {
    expect(parseDecimalBr("142.5")).toBe(142.5);
  });

  test("ignora espaços em volta", () => {
    expect(parseDecimalBr("  68  ")).toBe(68);
  });

  test("devolve 0 quando não há número", () => {
    expect(parseDecimalBr("")).toBe(0);
    expect(parseDecimalBr(null)).toBe(0);
    expect(parseDecimalBr("abc")).toBe(0);
  });
});

describe("taxaMensal", () => {
  test("converte 11,5% ao ano em ~0,9112% ao mês", () => {
    expect(taxaMensal(0.115)).toBeCloseTo(0.009112, 5);
  });

  test("taxa zero permanece zero", () => {
    expect(taxaMensal(0)).toBe(0);
  });
});

describe("parcelaPrice", () => {
  test("bate com o simulador de home equity (600k, 1,09% a.m., 240 meses)", () => {
    expect(Math.round(parcelaPrice(600000, 0.0109, 240))).toBe(7064);
  });

  test("sem juros, é a divisão simples do principal pelo prazo", () => {
    expect(parcelaPrice(120000, 0, 120)).toBe(1000);
  });

  test("devolve 0 quando o prazo ou o principal são inválidos", () => {
    expect(parcelaPrice(100000, 0.01, 0)).toBe(0);
    expect(parcelaPrice(0, 0.01, 240)).toBe(0);
  });
});

describe("parcelaInicialSAC", () => {
  test("bate com o simulador de financiamento (640k, 11,5% a.a., 420 meses)", () => {
    expect(Math.round(parcelaInicialSAC(640000, taxaMensal(0.115), 420))).toBe(7356);
  });

  test("bate com a tabela comparativa (800k, 11,19% a.a., 360 meses)", () => {
    expect(Math.round(parcelaInicialSAC(800000, taxaMensal(0.1119), 360))).toBe(9325);
  });

  test("devolve 0 quando o prazo ou o principal são inválidos", () => {
    expect(parcelaInicialSAC(100000, 0.01, 0)).toBe(0);
    expect(parcelaInicialSAC(0, 0.01, 360)).toBe(0);
  });
});

describe("telefoneValido", () => {
  test("aceita celular com 11 dígitos e nono dígito", () => {
    expect(telefoneValido("(19) 99783-4187")).toBe(true);
    expect(telefoneValido("19997834187")).toBe(true);
  });

  test("aceita fixo com 10 dígitos", () => {
    expect(telefoneValido("(19) 3876-1234")).toBe(true);
  });

  test("rejeita celular sem o nono dígito", () => {
    expect(telefoneValido("19897834187")).toBe(false);
  });

  test("rejeita DDD fora da faixa 11-99", () => {
    expect(telefoneValido("09997834187")).toBe(false);
    expect(telefoneValido("10997834187")).toBe(false);
  });

  test("rejeita quantidade de dígitos fora de 10-11", () => {
    expect(telefoneValido("199978341")).toBe(false);
    expect(telefoneValido("199978341870")).toBe(false);
    expect(telefoneValido("")).toBe(false);
  });
});

describe("cpfValido", () => {
  test("aceita CPF válido com e sem máscara", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
  });

  test("rejeita dígito verificador errado", () => {
    expect(cpfValido("529.982.247-26")).toBe(false);
  });

  test("rejeita sequência de dígitos repetidos", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("00000000000")).toBe(false);
  });

  test("rejeita comprimento inválido", () => {
    expect(cpfValido("123")).toBe(false);
    expect(cpfValido("")).toBe(false);
  });
});

describe("brl", () => {
  test("formata em reais sem centavos", () => {
    expect(brl(640000)).toBe("R$ 640.000");
  });

  test("arredonda para o real mais próximo", () => {
    expect(brl(7064.37)).toBe("R$ 7.064");
  });
});
