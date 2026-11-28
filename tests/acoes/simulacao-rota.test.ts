import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/simulacao/pdf", () => ({ gerarPdfSimulacao: vi.fn() }));
vi.mock("@/lib/email/notificar", () => ({ dependenciasEmailDoAmbiente: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/admin/crm/simulacao/route";
import { ERRO_SEM_ACESSO_CRM, ERRO_SESSAO_EXPIRADA } from "@/lib/admin/auth";

const pedido = () =>
  new Request("https://site.test/api/admin/crm/simulacao/", {
    method: "POST",
    body: JSON.stringify({ acao: "obter", leadId: "11111111-1111-4111-8111-111111111111", simulacaoId: "22222222-2222-4222-8222-222222222222" }),
  });

afterEach(() => vi.clearAllMocks());

describe("POST /api/admin/crm/simulacao/", () => {
  test("sem sessão responde 401", async () => {
    const falso = criarSupabaseFalso();
    falso.definirUsuario(null);
    vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
    const r = await POST(pedido());
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: ERRO_SESSAO_EXPIRADA });
  });

  test("conta logada sem perfil responde 403 e não lê lead nenhum", async () => {
    const falso = criarSupabaseFalso();
    falso.definirUsuario({ id: "u-sem-perfil" });
    falso.definirPapel(null);
    vi.mocked(createClient).mockResolvedValue(falso.cliente as never);

    const r = await POST(pedido());

    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: ERRO_SEM_ACESSO_CRM });
    expect(falso.chamadas.filter((c) => c.tabela !== "profiles")).toEqual([]);
  });
});
