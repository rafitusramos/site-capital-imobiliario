import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/admin-crm", () => ({
  getLead: vi.fn(),
  getLembretes: vi.fn(),
  getSimulacoes: vi.fn(),
  getTimeline: vi.fn(),
  getUsuarioCRM: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getLead, getLembretes, getSimulacoes, getTimeline, getUsuarioCRM } from "@/lib/queries/admin-crm";
import * as modulo from "@/app/actions/admin-crm-leitura";
import { carregarDetalheLead } from "@/app/actions/admin-crm-leitura";

const LEAD = "11111111-1111-4111-8111-111111111111";

function montar() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  falso.definirUsuario({ id: "user-1" });
  return falso;
}

afterEach(() => vi.clearAllMocks());

function nenhumaLeitura() {
  for (const leitura of [getLead, getLembretes, getSimulacoes, getTimeline, getUsuarioCRM]) {
    expect(leitura).not.toHaveBeenCalled();
  }
}

describe("carregarDetalheLead", () => {
  test("é a única ação exportada do módulo", () => {
    expect(Object.keys(modulo)).toEqual(["carregarDetalheLead"]);
  });

  test("sem sessão devolve null sem ler o lead", async () => {
    montar().definirUsuario(null);
    expect(await carregarDetalheLead(LEAD)).toBeNull();
    nenhumaLeitura();
  });

  test("conta logada sem perfil devolve null sem ler o lead", async () => {
    const falso = montar();
    falso.definirPapel(null);
    expect(await carregarDetalheLead(LEAD)).toBeNull();
    nenhumaLeitura();
  });

  test("id que não é uuid devolve null sem ler o lead", async () => {
    montar();
    expect(await carregarDetalheLead("1; drop table leads")).toBeNull();
    nenhumaLeitura();
  });

  test("membro com id válido carrega o detalhe", async () => {
    montar();
    vi.mocked(getLead).mockResolvedValue({ lead: { id: LEAD, tipo: "imoveis" } } as never);
    vi.mocked(getTimeline).mockResolvedValue([]);
    vi.mocked(getLembretes).mockResolvedValue([]);
    vi.mocked(getUsuarioCRM).mockResolvedValue({ id: "user-1", role: "admin" } as never);

    const r = await carregarDetalheLead(LEAD);

    expect(r).toMatchObject({ lead: { id: LEAD }, timeline: [], lembretes: [], simulacoes: [] });
    expect(getSimulacoes).not.toHaveBeenCalled();
  });
});
