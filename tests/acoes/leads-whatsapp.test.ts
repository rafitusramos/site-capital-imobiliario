import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/email/notificar", () => ({ dispararAvisosNovoLead: vi.fn() }));
vi.mock("@/lib/whatsapp/notificar", () => ({ dispararWhatsAppNovoLead: vi.fn() }));

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { after } from "next/server";
import { dispararWhatsAppNovoLead } from "@/lib/whatsapp/notificar";
import { criarLead } from "@/app/actions/leads";

function preparar(respostaUpdate: { data: unknown; error: unknown }) {
  vi.mocked(headers).mockResolvedValue({ get: () => null } as never);
  const falso = criarSupabaseFalso();
  falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
  falso.programarRpc("criar_lead_imovel", {
    data: { id: "lead-1", protocolo: "IMO-0001", nome: "Ana Costa", telefone: "19997834187" },
    error: null,
  });
  falso.programarResposta("leads", "update", respostaUpdate);
  vi.mocked(createAdminClient).mockReturnValue(falso.cliente as never);
  const agendados: Array<() => unknown> = [];
  vi.mocked(after).mockImplementation(((cb: () => unknown) => {
    agendados.push(cb);
  }) as never);
  return { falso, agendados };
}
const entrada = () => ({
  tipo: "imoveis" as const,
  dados: { nome: "Ana Costa", email: "ana@example.com", telefone: "(19) 99783-4187" },
  paginaUrl: "/imoveis/x",
  consentimentoLgpd: true,
});

afterEach(() => vi.clearAllMocks());

describe("criarLead — WhatsApp", () => {
  test("grava consentimento_whatsapp_em, confere com select e agenda o WhatsApp em after()", async () => {
    const { falso, agendados } = preparar({ data: [{ id: "lead-1" }], error: null });

    expect(await criarLead(entrada())).toEqual({ sucesso: true, protocolo: "IMO-0001" });

    const upd = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    expect(upd?.payload).toEqual({ consentimento_whatsapp_em: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
    expect(upd?.filtros).toEqual(expect.arrayContaining([{ metodo: "eq", args: ["id", "lead-1"] }]));
    expect(upd?.filtros.some((f) => f.metodo === "select")).toBe(true);

    expect(dispararWhatsAppNovoLead).not.toHaveBeenCalled();
    for (const a of agendados) await a();
    expect(dispararWhatsAppNovoLead).toHaveBeenCalledWith("lead-1");
  });

  test("update com erro: sucesso inalterado, console.error e sem WhatsApp", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const { agendados } = preparar({ data: null, error: { message: "boom" } });

    expect(await criarLead(entrada())).toEqual({ sucesso: true, protocolo: "IMO-0001" });

    expect(erro).toHaveBeenCalled();
    for (const a of agendados) await a();
    expect(dispararWhatsAppNovoLead).not.toHaveBeenCalled();
  });

  test("update que não casa linha nenhuma também não agenda o WhatsApp", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { agendados } = preparar({ data: [], error: null });

    expect(await criarLead(entrada())).toEqual({ sucesso: true, protocolo: "IMO-0001" });
    for (const a of agendados) await a();
    expect(dispararWhatsAppNovoLead).not.toHaveBeenCalled();
  });
});
