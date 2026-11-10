import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { simulacaoPendenteDoLead } from "@/app/actions/admin-simulacao";

const LEAD = "11111111-1111-4111-8111-111111111111";

function montar() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  falso.definirUsuario({ id: "user-1" });
  return falso;
}

afterEach(() => vi.clearAllMocks());

describe("simulacaoPendenteDoLead", () => {
  test("sem sessão devolve erro de sessão", async () => {
    montar().definirUsuario(null);
    expect(await simulacaoPendenteDoLead(LEAD)).toMatchObject({ sucesso: false });
  });

  test("id que não é uuid é recusado sem consultar o banco", async () => {
    const falso = montar();
    expect(await simulacaoPendenteDoLead("x")).toMatchObject({ sucesso: false });
    expect(falso.chamadas).toEqual([]);
  });

  test("devolve a mais recente que ainda não foi enviada (anexada, falha ou sem chave)", async () => {
    const falso = montar();
    falso.programarResposta("crm_simulacoes", "select", {
      data: { id: "sim-9", created_at: "2026-11-09T12:00:00+00:00" },
      error: null,
    });

    const r = await simulacaoPendenteDoLead(LEAD);

    expect(r).toEqual({ sucesso: true, simulacao: { id: "sim-9", anexadaEm: "2026-11-09T12:00:00+00:00" } });
    const filtros = falso.chamadas[0].filtros;
    expect(filtros).toEqual(
      expect.arrayContaining([
        { metodo: "eq", args: ["lead_id", LEAD] },
        { metodo: "neq", args: ["email_status", "enviado"] },
        { metodo: "order", args: ["created_at", { ascending: false }] },
        { metodo: "limit", args: [1] },
      ]),
    );
  });

  test("sem simulação pendente devolve null (o diálogo pede o PDF)", async () => {
    const falso = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: null, error: null });
    expect(await simulacaoPendenteDoLead(LEAD)).toEqual({ sucesso: true, simulacao: null });
  });

  test("falha na leitura não quebra o diálogo: console.error e cai em 'sem simulação'", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const falso = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: null, error: { message: "boom" } });
    expect(await simulacaoPendenteDoLead(LEAD)).toEqual({ sucesso: true, simulacao: null });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
