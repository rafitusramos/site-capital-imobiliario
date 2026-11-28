import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { ERRO_SEM_ACESSO_CRM, exigirAdmin, exigirMembroCRM, garantirAdminOuRedirecionar } from "@/lib/admin/auth";

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

describe("exigirMembroCRM", () => {
  test("sem sessão devolve erro de sessão", async () => {
    montarSupabase().definirUsuario(null);
    const { erro, user } = await exigirMembroCRM();
    expect(erro).toBe("Sessão expirada. Faça login novamente.");
    expect(user).toBeNull();
  });

  test("falha ao ler o perfil é registrada e nega o acesso", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    falso.programarResposta("profiles", "select", { data: null, error: { message: "boom" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const { erro } = await exigirMembroCRM();

    expect(erro).toBe("Não foi possível confirmar sua permissão.");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  test("conta sem perfil é barrada com a mensagem de acesso ao CRM", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    falso.definirPapel(null);
    const { erro, papel } = await exigirMembroCRM();
    expect(erro).toBe(ERRO_SEM_ACESSO_CRM);
    expect(papel).toBeUndefined();
  });

  test("corretor passa e o papel é devolvido", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    falso.definirPapel("corretor");
    const { erro, papel, user } = await exigirMembroCRM();
    expect(erro).toBeUndefined();
    expect(papel).toBe("corretor");
    expect(user?.id).toBe("u1");
  });

  test("admin passa e o papel é devolvido", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "u1" });
    const { erro, papel } = await exigirMembroCRM();
    expect(erro).toBeUndefined();
    expect(papel).toBe("admin");
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
