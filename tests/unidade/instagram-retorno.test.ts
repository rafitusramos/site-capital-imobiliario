import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const exigirAdmin = vi.fn();
const trocarCodigo = vi.fn();
const contaAtribuida = vi.fn();
const assinarWebhooks = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/admin/auth", () => ({ exigirAdmin: () => exigirAdmin() }));
vi.mock("@/lib/instagram/graph", () => ({
  trocarCodigo: (...a: unknown[]) => trocarCodigo(...a),
  contaAtribuida: (...a: unknown[]) => contaAtribuida(...a),
  assinarWebhooks: (...a: unknown[]) => assinarWebhooks(...a),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (t: string) => ({
      upsert: (...a: unknown[]) => {
        upsert(t, ...a);
        return {
          select: async () => upsertResultado,
        };
      },
    }),
  }),
}));

let upsertResultado: { data: unknown[] | null; error: unknown };

import { GET } from "@/app/api/meta/instagram/retorno/route";
import { SITE_URL } from "@/lib/site";

const TOKEN = "TOKEN-SECRETO-LONGO";
const ESTADO = "estado-abc";

function req(query: string, cookie: string | null = ESTADO) {
  return new NextRequest(`https://x.test/api/meta/instagram/retorno/?${query}`, {
    headers: cookie === null ? {} : { cookie: `ig_oauth_state=${cookie}` },
  });
}

function destino(r: Response) {
  const loc = r.headers.get("location") ?? "";
  return new URL(loc, "https://x.test");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  exigirAdmin.mockResolvedValue({ user: { id: "u1" }, erro: undefined });
  trocarCodigo.mockResolvedValue({ token: TOKEN });
  contaAtribuida.mockResolvedValue({ igUserId: "999", username: "rt", nome: "RT", fotoUrl: "http://f" });
  assinarWebhooks.mockResolvedValue(true);
  upsertResultado = { data: [{ id: 1 }], error: null };
});

describe("GET /api/meta/instagram/retorno/", () => {
  test("sem admin redireciona para o login e não troca código", async () => {
    exigirAdmin.mockResolvedValue({ user: null, erro: "Sessão expirada." });
    const r = await GET(req(`code=c&state=${ESTADO}`));
    expect(destino(r).pathname).toBe("/admin/login/");
    expect(trocarCodigo).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  test("state divergente: ?erro=state e nada gravado", async () => {
    const r = await GET(req("code=c&state=outro"));
    const d = destino(r);
    expect(d.pathname).toBe("/admin/instagram/conexao/");
    expect(d.searchParams.get("erro")).toBe("state");
    expect(trocarCodigo).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  test("sem cookie de state: ?erro=state", async () => {
    const r = await GET(req(`code=c&state=${ESTADO}`, null));
    expect(destino(r).searchParams.get("erro")).toBe("state");
    expect(upsert).not.toHaveBeenCalled();
  });

  test("usuário cancelou na Meta: ?erro=cancelado", async () => {
    const r = await GET(req(`error=access_denied&state=${ESTADO}`));
    expect(destino(r).searchParams.get("erro")).toBe("cancelado");
    expect(upsert).not.toHaveBeenCalled();
  });

  test("fluxo feliz grava a conta com o token, assina webhooks e apaga o cookie", async () => {
    const r = await GET(req(`code=c&state=${ESTADO}`));
    expect(trocarCodigo).toHaveBeenCalledWith("c", `${SITE_URL}/api/meta/instagram/retorno/`);
    expect(contaAtribuida).toHaveBeenCalledWith(TOKEN);
    expect(assinarWebhooks).toHaveBeenCalledWith(TOKEN, "999");
    const gravacoes = upsert.mock.calls.filter((c) => c[0] === "ig_conta");
    expect(gravacoes.length).toBeGreaterThanOrEqual(1);
    const ultima = gravacoes[gravacoes.length - 1][1] as Record<string, unknown>;
    expect(ultima).toMatchObject({
      id: 1,
      ig_user_id: "999",
      username: "rt",
      token: TOKEN,
      webhooks_assinados: true,
      conectado_por: "u1",
    });
    const d = destino(r);
    expect(d.pathname).toBe("/admin/instagram/conexao/");
    expect(d.searchParams.get("ok")).toBe("1");
    expect(r.headers.get("set-cookie")).toMatch(/ig_oauth_state=;/);
  });

  test("webhooks que falham ficam registrados como não assinados", async () => {
    assinarWebhooks.mockResolvedValue(false);
    await GET(req(`code=c&state=${ESTADO}`));
    const gravacoes = upsert.mock.calls.filter((c) => c[0] === "ig_conta");
    const ultima = gravacoes[gravacoes.length - 1][1] as Record<string, unknown>;
    expect(ultima.webhooks_assinados).toBe(false);
  });

  test("o token nunca aparece na URL de redirecionamento nem nos logs", async () => {
    const r = await GET(req(`code=c&state=${ESTADO}`));
    expect(r.headers.get("location")).not.toContain(TOKEN);
    const logs = JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls);
    expect(logs).not.toContain(TOKEN);
  });

  test("falhas: troca, conta e gravar viram ?erro curto", async () => {
    trocarCodigo.mockResolvedValueOnce(null);
    expect(destino(await GET(req(`code=c&state=${ESTADO}`))).searchParams.get("erro")).toBe("troca");

    contaAtribuida.mockResolvedValueOnce(null);
    expect(destino(await GET(req(`code=c&state=${ESTADO}`))).searchParams.get("erro")).toBe("conta");

    upsertResultado = { data: null, error: { message: "boom" } };
    const r = await GET(req(`code=c&state=${ESTADO}`));
    expect(destino(r).searchParams.get("erro")).toBe("gravar");
    expect(r.headers.get("location")).not.toContain(TOKEN);
  });

  test("upsert que não devolve linha conta como falha de gravação", async () => {
    upsertResultado = { data: [], error: null };
    const r = await GET(req(`code=c&state=${ESTADO}`));
    expect(destino(r).searchParams.get("erro")).toBe("gravar");
  });

  test("sem code: ?erro=troca", async () => {
    const r = await GET(req(`state=${ESTADO}`));
    expect(destino(r).searchParams.get("erro")).toBe("troca");
  });
});
