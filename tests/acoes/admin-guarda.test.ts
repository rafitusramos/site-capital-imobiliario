import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { exigirAdmin, garantirAdminOuRedirecionar } from "@/lib/admin/auth";

function montarSupabase() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  return falso;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("exigirAdmin", () => {
  test("sem sessão devolve erro de sessão", async () => {
    montarSupabase().definirUsuario(null);
    const { erro } = await exigirAdmin();
    expect(erro).toBe("Sessão expirada. Faça login novamente.");
  });

  test("corretor é barrado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    falso.definirPapel("corretor");
    const { erro } = await exigirAdmin();
    expect(erro).toBe("Apenas administradores podem fazer isso.");
  });

  test("admin passa sem erro", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    const { erro, user } = await exigirAdmin();
    expect(erro).toBeUndefined();
    expect(user?.id).toBe("u1");
  });

  test("falha ao ler o perfil é registrada e nega o acesso", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    falso.programarResposta("profiles", "select", { data: null, error: { message: "boom" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const { erro } = await exigirAdmin();

    expect(erro).toBe("Não foi possível confirmar sua permissão.");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("garantirAdminOuRedirecionar", () => {
  test("corretor é mandado para o CRM", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    falso.definirPapel("corretor");
    await expect(garantirAdminOuRedirecionar()).rejects.toThrow("REDIRECT:/admin/crm/");
  });

  test("admin segue sem redirecionar", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    await expect(garantirAdminOuRedirecionar()).resolves.toBeUndefined();
  });
});
