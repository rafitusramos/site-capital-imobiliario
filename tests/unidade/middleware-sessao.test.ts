import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type SetAll = (c: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void;

const estado = {
  user: null as { id: string } | null,
  perfil: null as { id: string } | null,
  erroPerfil: null as unknown,
  setAll: null as SetAll | null,
  signOut: vi.fn(),
  consultasPerfil: [] as Array<{ tabela: string; colunas: string; id: unknown }>,
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, opcoes: { cookies: { setAll: SetAll } }) => {
    estado.setAll = opcoes.cookies.setAll;
    return {
      auth: {
        getUser: async () => ({ data: { user: estado.user }, error: null }),
        signOut: async () => {
          estado.signOut();
          // O @supabase/ssr limpa os cookies de sessão pelo setAll.
          estado.setAll?.([{ name: "sb-projeto-auth-token", value: "", options: { maxAge: 0, path: "/" } }]);
          return { error: null };
        },
      },
      from: (tabela: string) => ({
        select: (colunas: string) => ({
          eq: (_coluna: string, id: unknown) => ({
            maybeSingle: async () => {
              estado.consultasPerfil.push({ tabela, colunas, id });
              return { data: estado.perfil, error: estado.erroPerfil };
            },
          }),
        }),
      }),
    };
  }),
}));

import { updateSession } from "@/lib/supabase/middleware";

const req = (caminho: string) => new NextRequest(`https://rtcapitalimobiliario.com.br${caminho}`);

beforeEach(() => {
  estado.user = null;
  estado.perfil = null;
  estado.erroPerfil = null;
  estado.consultasPerfil = [];
  estado.signOut.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

afterEach(() => vi.restoreAllMocks());

describe("updateSession (middleware do admin)", () => {
  test("sem usuário, fora do login, redireciona para o login", async () => {
    const r = await updateSession(req("/admin/crm/"));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get("location")!).pathname).toBe("/admin/login/");
    expect(estado.consultasPerfil).toEqual([]);
  });

  test("sem usuário no login com barra final não faz loop", async () => {
    const r = await updateSession(req("/admin/login/"));
    expect(r.headers.get("location")).toBeNull();
    expect(r.status).toBe(200);
  });

  test("usuário sem perfil: encerra a sessão e vai ao login com acesso=negado, levando os cookies limpos", async () => {
    estado.user = { id: "u-sem-perfil" };
    estado.perfil = null;

    const r = await updateSession(req("/admin/crm/"));

    expect(estado.signOut).toHaveBeenCalledTimes(1);
    expect(r.status).toBe(307);
    const destino = new URL(r.headers.get("location")!);
    expect(destino.pathname).toBe("/admin/login/");
    expect(destino.searchParams.get("acesso")).toBe("negado");
    expect(r.headers.get("set-cookie")).toContain("sb-projeto-auth-token=;");
    expect(estado.consultasPerfil).toEqual([{ tabela: "profiles", colunas: "id", id: "u-sem-perfil" }]);
  });

  test("usuário sem perfil na própria página de login não entra em loop: sai e fica no login", async () => {
    estado.user = { id: "u-sem-perfil" };
    const r = await updateSession(req("/admin/login/?acesso=negado"));
    expect(r.headers.get("location")).toBeNull();
    expect(estado.signOut).toHaveBeenCalledTimes(1);
    expect(r.headers.get("set-cookie")).toContain("sb-projeto-auth-token=;");
  });

  test("erro ao ler o perfil não derruba o admin: registra e segue", async () => {
    estado.user = { id: "u1" };
    estado.erroPerfil = { message: "timeout" };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await updateSession(req("/admin/crm/"));

    expect(log).toHaveBeenCalled();
    expect(estado.signOut).not.toHaveBeenCalled();
    expect(r.headers.get("location")).toBeNull();
  });

  test("usuário com perfil segue normalmente", async () => {
    estado.user = { id: "u1" };
    estado.perfil = { id: "u1" };
    const r = await updateSession(req("/admin/crm/"));
    expect(r.headers.get("location")).toBeNull();
    expect(estado.signOut).not.toHaveBeenCalled();
  });

  test("usuário com perfil na página de login vai para o início do admin", async () => {
    estado.user = { id: "u1" };
    estado.perfil = { id: "u1" };
    const r = await updateSession(req("/admin/login/"));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get("location")!).pathname).toBe("/admin/crm/");
  });
});
