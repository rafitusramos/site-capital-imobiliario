import { beforeEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/whatsapp/config", () => ({ configWhatsApp: vi.fn() }));
vi.mock("@/lib/whatsapp/cloud", () => ({ criarCloud: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { configWhatsApp } from "@/lib/whatsapp/config";
import { criarCloud } from "@/lib/whatsapp/cloud";
import { ERRO_APENAS_ADMIN } from "@/lib/admin/auth";
import { assinarWebhooksWhatsApp, salvarNumeroOficial } from "@/app/actions/admin-whatsapp";
import { mascararWaId } from "@/lib/whatsapp/mascara";

let falso: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  falso = criarSupabaseFalso();
  falso.definirUsuario({ id: "user-1" });
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
});

describe("acesso", () => {
  test("corretor recebe ERRO_APENAS_ADMIN nas duas ações e nada é gravado", async () => {
    falso.definirPapel("corretor");
    const r1 = await salvarNumeroOficial("19 99123-4567");
    const r2 = await assinarWebhooksWhatsApp();
    expect(r1).toEqual({ sucesso: false, erro: ERRO_APENAS_ADMIN });
    expect(r2).toEqual({ sucesso: false, erro: ERRO_APENAS_ADMIN });
    expect(falso.chamadas.filter((c) => c.tabela === "wa_config")).toHaveLength(0);
    expect(criarCloud).not.toHaveBeenCalled();
  });
});

describe("salvarNumeroOficial", () => {
  test("recusa número inválido sem tocar no banco", async () => {
    const r = await salvarNumeroOficial("123");
    expect(r.sucesso).toBe(false);
    expect(r.erro).toMatch(/número/i);
    expect(falso.chamadas.filter((c) => c.tabela === "wa_config")).toHaveLength(0);
  });

  test("grava o número normalizado (55 + DDD + número, só dígitos) em wa_config id 1", async () => {
    falso.programarResposta("wa_config", "update", { data: [{ id: 1 }], error: null });
    const r = await salvarNumeroOficial("(19) 99123-4567");
    expect(r).toEqual({ sucesso: true });
    const upd = falso.chamadas.find((c) => c.tabela === "wa_config" && c.operacao === "update");
    expect(upd?.payload).toEqual({ numero_oficial: "5519991234567" });
    expect(upd?.filtros).toContainEqual({ metodo: "eq", args: ["id", 1] });
  });

  test("zero linhas atualizadas vira erro (update sem efeito não é sucesso)", async () => {
    falso.programarResposta("wa_config", "update", { data: [], error: null });
    const r = await salvarNumeroOficial("19991234567");
    expect(r.sucesso).toBe(false);
    expect(r.erro).toBeTruthy();
  });

  test("erro do banco vira mensagem amigável", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    falso.programarResposta("wa_config", "update", { data: null, error: { message: "boom" } });
    const r = await salvarNumeroOficial("19991234567");
    expect(r.sucesso).toBe(false);
    expect(r.erro).not.toContain("boom");
  });
});

describe("assinarWebhooksWhatsApp", () => {
  test("sem configuração devolve erro amigável e não chama a Meta", async () => {
    vi.mocked(configWhatsApp).mockReturnValue(null);
    const r = await assinarWebhooksWhatsApp();
    expect(r.sucesso).toBe(false);
    expect(r.erro).toMatch(/configur/i);
    expect(criarCloud).not.toHaveBeenCalled();
  });

  test("com configuração assina pela WABA", async () => {
    vi.mocked(configWhatsApp).mockReturnValue({ token: "t", phoneNumberId: "p", wabaId: "w1", segredos: ["s"] });
    const assinar = vi.fn().mockResolvedValue(true);
    vi.mocked(criarCloud).mockReturnValue({ assinarWebhooks: assinar } as never);
    const r = await assinarWebhooksWhatsApp();
    expect(r).toEqual({ sucesso: true });
    expect(assinar).toHaveBeenCalledWith("w1");
  });

  test("recusa da Meta vira erro", async () => {
    vi.mocked(configWhatsApp).mockReturnValue({ token: "t", phoneNumberId: "p", wabaId: "w1", segredos: ["s"] });
    vi.mocked(criarCloud).mockReturnValue({ assinarWebhooks: vi.fn().mockResolvedValue(false) } as never);
    const r = await assinarWebhooksWhatsApp();
    expect(r.sucesso).toBe(false);
  });
});

describe("mascararWaId", () => {
  test("móvel: mantém DDD, 1º dígito e os 4 últimos", () => {
    expect(mascararWaId("5519991234567")).toBe("+55 19 9••••-4567");
  });
  test("fixo e formato estranho nunca expõem o número inteiro", () => {
    expect(mascararWaId("551933334444")).toBe("+55 19 3••••-4444");
    expect(mascararWaId("12345678")).toBe("••••-5678");
    expect(mascararWaId("")).toBe("—");
  });
});
