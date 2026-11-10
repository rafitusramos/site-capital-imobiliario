import { describe, expect, test } from "vitest";
import { corpoSimulacaoSchema } from "@/lib/simulacao/schema";

const LEAD = "11111111-1111-4111-8111-111111111111";
function corpo(sobrepor: Record<string, unknown> = {}, banco: Record<string, unknown> = {}) {
  return {
    acao: "previa",
    leadId: LEAD,
    dados: {
      data: "06/11/2026",
      valor_imovel: 400000,
      valor_financiamento: 260000,
      renda_media: 9000,
      meses: [1, 12],
      bancos: [
        {
          nome: "Banco Alfa", taxa: 12, cet: 13, custo_total: 800000, prazo: 420, indexador: "TR", sistema: "SAC",
          primeira: 3000, ultima: 650, parcelas: [3000, null], logo: null, ...banco,
        },
      ],
      ...sobrepor,
    },
  };
}

describe("corpoSimulacaoSchema", () => {
  test("aceita um corpo válido (parcela nula e logo nulo)", () => {
    expect(corpoSimulacaoSchema.safeParse(corpo()).success).toBe(true);
  });
  test("data vazia vale (o PDF pode não trazer data)", () => {
    expect(corpoSimulacaoSchema.safeParse(corpo({ data: "" })).success).toBe(true);
  });
  test("recusa número não finito e fora de limite", () => {
    expect(corpoSimulacaoSchema.safeParse(corpo({ valor_imovel: Infinity })).success).toBe(false);
    expect(corpoSimulacaoSchema.safeParse(corpo({ valor_imovel: NaN })).success).toBe(false);
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { custo_total: 1e12 })).success).toBe(false);
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { primeira: -1 })).success).toBe(false);
  });
  test("recusa logo que não seja data URI PNG", () => {
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { logo: "data:image/png;base64,AAAA" })).success).toBe(true);
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { logo: "https://x.com/a.png" })).success).toBe(false);
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { logo: "data:image/svg+xml;base64,AAAA" })).success).toBe(false);
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { logo: 'data:image/png;base64,AA"onerror="x' })).success).toBe(false);
  });
  test("recusa logo acima do teto de bytes", () => {
    const grande = "data:image/png;base64," + "A".repeat(400_001);
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { logo: grande })).success).toBe(false);
  });
  test("recusa parcelas que não batem com os meses", () => {
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { parcelas: [3000] })).success).toBe(false);
  });
  test("recusa texto grande demais e lead que não é uuid", () => {
    expect(corpoSimulacaoSchema.safeParse(corpo({}, { nome: "x".repeat(61) })).success).toBe(false);
    expect(corpoSimulacaoSchema.safeParse({ ...corpo(), leadId: "abc" }).success).toBe(false);
  });
  test("recusa ação desconhecida; não aceita nome nem e-mail do cliente (ignorados)", () => {
    expect(corpoSimulacaoSchema.safeParse({ ...corpo(), acao: "apagar" }).success).toBe(false);
    const r = corpoSimulacaoSchema.safeParse({ ...corpo(), nome: "Fulano", email: "x@y.com" });
    expect(r.success && "nome" in r.data).toBe(false);
  });
});

describe("corpoSimulacaoSchema: anexar e enviar", () => {
  const SIM = "22222222-2222-4222-8222-222222222222";
  test("anexar leva os dados, como a prévia", () => {
    expect(corpoSimulacaoSchema.safeParse({ ...corpo(), acao: "anexar" }).success).toBe(true);
  });
  test("enviar leva só o simulacaoId do PDF já gravado, sem dados", () => {
    const r = corpoSimulacaoSchema.safeParse({ acao: "enviar", leadId: LEAD, simulacaoId: SIM });
    expect(r.success).toBe(true);
  });
  test("enviar sem simulacaoId ou com id inválido é recusado", () => {
    expect(corpoSimulacaoSchema.safeParse({ acao: "enviar", leadId: LEAD }).success).toBe(false);
    expect(corpoSimulacaoSchema.safeParse({ acao: "enviar", leadId: LEAD, simulacaoId: "x" }).success).toBe(false);
  });
  test("enviar não aceita dados do cliente (o PDF é o gravado, nunca regerado)", () => {
    const r = corpoSimulacaoSchema.safeParse({ ...corpo(), acao: "enviar", simulacaoId: SIM });
    expect(r.success && "dados" in r.data).toBe(false);
  });
  test("obter devolve o PDF gravado: leadId + simulacaoId", () => {
    expect(corpoSimulacaoSchema.safeParse({ acao: "obter", leadId: LEAD, simulacaoId: SIM }).success).toBe(true);
  });
});
