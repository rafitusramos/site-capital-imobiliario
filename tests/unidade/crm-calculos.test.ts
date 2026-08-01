import { describe, expect, test } from "vitest";
import { formatarLtv, formatarMoeda, ltv, somaColuna, valorNegocio } from "@/lib/crm/calculos";

// `toLocaleString("pt-BR", { style: "currency" })` usa espaço fino
// inseparável (U+00A0) entre "R$" e o número, não o espaço comum — por isso
// os valores esperados abaixo usam esta constante em vez de um espaço
// digitado normalmente, que faria o teste falhar por um caractere invisível.
const NBSP = " ";

describe("valorNegocio", () => {
  test("financiamento usa valorCredito", () => {
    expect(valorNegocio({ tipo: "financiamento", valorCredito: 400_000 })).toBe(400_000);
  });

  test("home-equity usa valorCreditoDesejado, não valorCreditoEstimado", () => {
    expect(
      valorNegocio({
        tipo: "home-equity",
        valorCreditoDesejado: 250_000,
      }),
    ).toBe(250_000);
  });

  test("consórcio usa valorCarta", () => {
    expect(valorNegocio({ tipo: "consorcio", valorCarta: 120_000 })).toBe(120_000);
  });

  test("imóveis usa orcamentoMax", () => {
    expect(valorNegocio({ tipo: "imoveis", orcamentoMax: 800_000 })).toBe(800_000);
  });

  test("campo ausente ou nulo devolve null (não zero)", () => {
    expect(valorNegocio({ tipo: "financiamento" })).toBeNull();
    expect(valorNegocio({ tipo: "financiamento", valorCredito: null })).toBeNull();
  });

  test("campo de outra origem é ignorado (não vaza entre pipelines)", () => {
    expect(valorNegocio({ tipo: "financiamento", valorCarta: 999_999 })).toBeNull();
  });
});

describe("ltv", () => {
  test("razão simples entre crédito desejado e imóvel em garantia", () => {
    expect(ltv(360_000, 500_000)).toBe(0.72);
  });

  test("garantia zero ou negativa devolve null (divisão por zero é indefinida no negócio)", () => {
    expect(ltv(100_000, 0)).toBeNull();
    expect(ltv(100_000, -1)).toBeNull();
  });

  test("crédito ausente devolve null", () => {
    expect(ltv(null, 500_000)).toBeNull();
    expect(ltv(undefined, 500_000)).toBeNull();
  });

  test("garantia ausente devolve null", () => {
    expect(ltv(360_000, null)).toBeNull();
  });
});

describe("formatarLtv", () => {
  test("formata como percentual pt-BR com uma casa decimal", () => {
    expect(formatarLtv(360_000, 500_000)).toBe("72,0%");
  });

  test("indefinido devolve travessão", () => {
    expect(formatarLtv(null, 500_000)).toBe("—");
    expect(formatarLtv(100_000, 0)).toBe("—");
  });
});

describe("formatarMoeda", () => {
  test("reaproveita a formatação BRL de lib/imoveis/formato.ts (sem casas decimais)", () => {
    expect(formatarMoeda(4_320_000)).toBe(`R$${NBSP}4.320.000`);
  });

  test("nulo ou indefinido devolve travessão", () => {
    expect(formatarMoeda(null)).toBe("—");
    expect(formatarMoeda(undefined)).toBe("—");
  });

  test("zero é um valor de negócio válido, não 'sem valor'", () => {
    expect(formatarMoeda(0)).toBe(`R$${NBSP}0`);
  });
});

describe("somaColuna", () => {
  test("soma valor_negocio de uma lista de leads", () => {
    const leads = [{ valor_negocio: 100 }, { valor_negocio: 200 }, { valor_negocio: 50 }];
    expect(somaColuna(leads)).toBe(350);
  });

  test("trata null como zero, não interrompe a soma", () => {
    const leads = [{ valor_negocio: 100 }, { valor_negocio: null }, { valor_negocio: 200 }];
    expect(somaColuna(leads)).toBe(300);
  });

  test("lista vazia soma zero", () => {
    expect(somaColuna([])).toBe(0);
  });
});
