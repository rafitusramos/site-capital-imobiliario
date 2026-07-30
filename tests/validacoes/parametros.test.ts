import { describe, expect, test } from "vitest";
import { parametrosSimuladorSchema } from "@/lib/validations/parametros";

function base() {
  return {
    financiamentoTaxaAnual: 11.5,
    homeEquityTaxaMensal: 1.09,
  };
}

describe("parametrosSimuladorSchema", () => {
  test("valores válidos passam", () => {
    expect(parametrosSimuladorSchema.safeParse(base()).success).toBe(true);
  });

  test("financiamentoTaxaAnual igual a 0 reprova", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), financiamentoTaxaAnual: 0 });
    expect(parsed.success).toBe(false);
  });

  test("financiamentoTaxaAnual negativa reprova", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), financiamentoTaxaAnual: -5 });
    expect(parsed.success).toBe(false);
  });

  test("financiamentoTaxaAnual aceita o limite 30", () => {
    expect(parametrosSimuladorSchema.safeParse({ ...base(), financiamentoTaxaAnual: 30 }).success).toBe(
      true,
    );
  });

  test("financiamentoTaxaAnual reprova 115 (erro de digitação de 11,5)", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), financiamentoTaxaAnual: 115 });
    expect(parsed.success).toBe(false);
  });

  test("homeEquityTaxaMensal igual a 0 reprova", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), homeEquityTaxaMensal: 0 });
    expect(parsed.success).toBe(false);
  });

  test("homeEquityTaxaMensal negativa reprova", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), homeEquityTaxaMensal: -1 });
    expect(parsed.success).toBe(false);
  });

  test("homeEquityTaxaMensal aceita o limite 5", () => {
    expect(parametrosSimuladorSchema.safeParse({ ...base(), homeEquityTaxaMensal: 5 }).success).toBe(true);
  });

  test("homeEquityTaxaMensal reprova acima do limite", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), homeEquityTaxaMensal: 5.01 });
    expect(parsed.success).toBe(false);
  });

  // Campo esvaziado no formulário: input[type=number].valueAsNumber devolve
  // NaN, e é esse NaN que chega na server action. O schema é a única barreira
  // entre ele e um UPDATE com taxa inválida, então o comportamento fica
  // travado aqui em vez de depender de detalhe interno do zod.
  test("NaN reprova, com mensagem legível", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), financiamentoTaxaAnual: NaN });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Informe a taxa de financiamento.");
  });

  test("NaN em homeEquityTaxaMensal também reprova", () => {
    const parsed = parametrosSimuladorSchema.safeParse({ ...base(), homeEquityTaxaMensal: NaN });
    expect(parsed.success).toBe(false);
  });
});
