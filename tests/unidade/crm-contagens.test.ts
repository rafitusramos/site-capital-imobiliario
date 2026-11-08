import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getContagensPorAba, getContagensPorEtapa } from "@/lib/queries/admin-crm";
import { etapasDoTipo } from "@/lib/crm/etapas";

function montarSupabase() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  return falso;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// docs/crm-spec.md §5 caso 10 e §6: o cabeçalho continua verdadeiro porque a
// soma vem do banco (RPC contar_leads_crm), não de linhas truncadas pelo
// max-rows do PostgREST.
describe("getContagensPorEtapa", () => {
  test("chama o RPC uma única vez, filtrando pelo tipo, sem select em tabela", async () => {
    const falso = montarSupabase();
    falso.programarRpc("contar_leads_crm", { data: [], error: null });

    await getContagensPorEtapa("financiamento");

    expect(falso.chamadasRpc).toEqual([{ nome: "contar_leads_crm", params: { p_tipo: "financiamento" } }]);
    expect(falso.chamadas).toHaveLength(0);
  });

  test("mapeia total e soma de cada etapa e converte numeric em string para número", async () => {
    const falso = montarSupabase();
    falso.programarRpc("contar_leads_crm", {
      data: [
        { tipo: "financiamento", status: "simulacao", total: 7, soma_valor_negocio: "4320000.50" },
        { tipo: "financiamento", status: "ganho", total: "2", soma_valor_negocio: 900000 },
      ],
      error: null,
    });

    const r = await getContagensPorEtapa("financiamento");

    expect(r.find((c) => c.etapa === "simulacao")).toEqual({ etapa: "simulacao", total: 7, somaValorNegocio: 4320000.5 });
    expect(r.find((c) => c.etapa === "ganho")).toEqual({ etapa: "ganho", total: 2, somaValorNegocio: 900000 });
  });

  test("toda etapa do pipeline aparece, na ordem, mesmo com zero", async () => {
    const falso = montarSupabase();
    falso.programarRpc("contar_leads_crm", {
      data: [{ tipo: "financiamento", status: "simulacao", total: 1, soma_valor_negocio: 10 }],
      error: null,
    });

    const r = await getContagensPorEtapa("financiamento");

    expect(r.map((c) => c.etapa)).toEqual(etapasDoTipo("financiamento").map((e) => e.slug));
    const vazias = r.filter((c) => c.etapa !== "simulacao");
    expect(vazias.length).toBeGreaterThan(0);
    expect(vazias.every((c) => c.total === 0 && c.somaValorNegocio === 0)).toBe(true);
  });

  test("registra e relança o erro do RPC", async () => {
    const falso = montarSupabase();
    const erro = { message: "falhou" };
    falso.programarRpc("contar_leads_crm", { data: null, error: erro });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getContagensPorEtapa("financiamento")).rejects.toBe(erro);
    expect(spy).toHaveBeenCalled();
  });
});

describe("getContagensPorAba", () => {
  test("chama o RPC uma única vez, sem filtro, sem select em tabela", async () => {
    const falso = montarSupabase();
    falso.programarRpc("contar_leads_crm", { data: [], error: null });

    await getContagensPorAba();

    expect(falso.chamadasRpc).toHaveLength(1);
    expect(falso.chamadasRpc[0].nome).toBe("contar_leads_crm");
    expect(falso.chamadasRpc[0].params ?? {}).not.toHaveProperty("p_tipo");
    expect(falso.chamadas).toHaveLength(0);
  });

  test("soma as etapas de cada tipo (bigint pode chegar como string) e preenche tipos ausentes com zero", async () => {
    const falso = montarSupabase();
    falso.programarRpc("contar_leads_crm", {
      data: [
        { tipo: "financiamento", status: "simulacao", total: 3, soma_valor_negocio: 0 },
        { tipo: "financiamento", status: "ganho", total: "4", soma_valor_negocio: 0 },
        { tipo: "imoveis", status: "novo", total: 5, soma_valor_negocio: 0 },
      ],
      error: null,
    });

    const r = await getContagensPorAba();
    const porTipo = Object.fromEntries(r.map((c) => [c.tipo, c.total]));

    expect(porTipo.financiamento).toBe(7);
    expect(porTipo.imoveis).toBe(5);
    expect(porTipo.consorcio).toBe(0);
    expect(porTipo["home-equity"]).toBe(0);
    expect(r).toHaveLength(4);
  });

  test("registra e relança o erro do RPC", async () => {
    const falso = montarSupabase();
    const erro = { message: "falhou" };
    falso.programarRpc("contar_leads_crm", { data: null, error: erro });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getContagensPorAba()).rejects.toBe(erro);
    expect(spy).toHaveBeenCalled();
  });
});
