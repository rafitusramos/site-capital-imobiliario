import { describe, expect, it } from "vitest";
import { cenarioSac } from "@/lib/simulador/cenarios-sac";

// Trava os números da tabela estática de /financiamento/ (mercado em 29/10/2026):
// R$ 800 mil, 360 meses, SAC, sem TR, taxa mensal equivalente (1+a)^(1/12)-1.
const P = 800_000;
const N = 360;

const arredondaMil10 = (v: number) => Math.round(v / 10_000) / 100; // em milhões, 2 casas

describe("cenários SAC da landing de financiamento", () => {
  const alto = cenarioSac(P, N, 0.15);
  const medio = cenarioSac(P, N, 0.1325);
  const melhor = cenarioSac(P, N, 0.1169);

  it("primeira parcela", () => {
    expect(Math.round(alto.primeiraParcela)).toBe(11594);
    expect(Math.round(medio.primeiraParcela)).toBe(10561);
    expect(Math.round(melhor.primeiraParcela)).toBe(9627);
  });

  it("total pago, arredondado a R$ 10 mil", () => {
    expect(arredondaMil10(alto.totalPago)).toBe(2.49);
    expect(arredondaMil10(medio.totalPago)).toBe(2.31);
    expect(arredondaMil10(melhor.totalPago)).toBe(2.14);
  });

  it("diferença para a melhor taxa, em R$ mil", () => {
    expect(Math.round((alto.totalPago - melhor.totalPago) / 1000)).toBe(355);
    expect(Math.round((medio.totalPago - melhor.totalPago) / 1000)).toBe(169);
  });

  it("diferença de taxa entre bancos (~3,3 p.p.)", () => {
    expect(Math.round((0.15 - 0.1169) * 1000) / 10).toBe(3.3);
  });
});
