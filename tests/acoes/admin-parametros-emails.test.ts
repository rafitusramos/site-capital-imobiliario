import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { salvarNotificaLead } from "@/app/actions/admin-parametros";

function montar() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  falso.definirUsuario({ id: "admin-1" });
  return falso;
}

afterEach(() => vi.clearAllMocks());

describe("salvarNotificaLead", () => {
  test("sem sessão devolve erro de sessão", async () => {
    montar().definirUsuario(null);
    expect(await salvarNotificaLead({ tipo: "financiamento", etapa: "simulacao", notifica: true })).toEqual({
      sucesso: false,
      erro: "Sessão expirada. Faça login novamente.",
    });
  });

  test("corretor é barrado e nada é gravado", async () => {
    const falso = montar();
    falso.definirPapel("corretor");

    const r = await salvarNotificaLead({ tipo: "financiamento", etapa: "simulacao", notifica: true });

    expect(r.sucesso).toBe(false);
    expect(falso.chamadas.some((c) => c.tabela === "crm_etapas")).toBe(false);
  });

  test("grava notifica_lead filtrando pela PK composta (tipo, slug)", async () => {
    const falso = montar();
    falso.programarResposta("crm_etapas", "update", { data: [{ slug: "simulacao" }], error: null });

    const r = await salvarNotificaLead({ tipo: "financiamento", etapa: "simulacao", notifica: true });

    expect(r).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "crm_etapas" && c.operacao === "update")!;
    expect(chamada.payload).toEqual({ notifica_lead: true });
    expect(chamada.filtros).toContainEqual({ metodo: "eq", args: ["tipo", "financiamento"] });
    expect(chamada.filtros).toContainEqual({ metodo: "eq", args: ["slug", "simulacao"] });
  });

  test("update que não casa linha nenhuma é erro, não sucesso", async () => {
    const falso = montar();
    falso.programarResposta("crm_etapas", "update", { data: [], error: null });

    const r = await salvarNotificaLead({ tipo: "financiamento", etapa: "simulacao", notifica: false });

    expect(r.sucesso).toBe(false);
    expect(r.erro).toMatch(/025/);
  });

  test("erro do banco vira mensagem amigável e é logado", async () => {
    const falso = montar();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    falso.programarResposta("crm_etapas", "update", { data: null, error: { message: "boom" } });

    const r = await salvarNotificaLead({ tipo: "financiamento", etapa: "simulacao", notifica: true });

    expect(r).toEqual({ sucesso: false, erro: "Não foi possível salvar." });
    expect(log).toHaveBeenCalled();
  });

  test("etapa ou origem inválidas são recusadas antes de tocar no banco", async () => {
    const falso = montar();
    const r = await salvarNotificaLead({ tipo: "xxx" as never, etapa: "simulacao", notifica: true });
    expect(r.sucesso).toBe(false);
    expect(falso.chamadas.some((c) => c.tabela === "crm_etapas")).toBe(false);
  });
});
