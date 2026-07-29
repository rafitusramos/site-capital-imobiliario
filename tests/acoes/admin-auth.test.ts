import { describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sair } from "@/app/actions/admin-auth";

describe("sair", () => {
  test("encerra a sessão e redireciona para /admin/login", async () => {
    const falso = criarSupabaseFalso();
    vi.mocked(createClient).mockResolvedValue(falso.cliente as never);

    await sair();

    expect(falso.cliente.auth.signOut).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });
});
