import { beforeEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
const motor = {
  agendarConfirmacao: vi.fn(async () => {}),
  agendarAvisoEtapa: vi.fn(async () => {}),
  cancelarAvisosEtapa: vi.fn(async () => {}),
};
let motorOk = true;
vi.mock("@/lib/whatsapp/motor-padrao", () => ({ motorWaPadrao: () => (motorOk ? motor : null) }));

import { createAdminClient } from "@/lib/supabase/admin";
import { dispararWhatsAppMudancaEtapa, dispararWhatsAppNovoLead } from "@/lib/whatsapp/notificar";

const LINHA = {
  id: "lead-1",
  tipo: "financiamento",
  nome: "Maria",
  telefone: "19999991234",
  protocolo: "FIN-1",
  consentimento_whatsapp_em: "2026-11-13T12:00:00Z",
};

function preparar(notifica: boolean | null, lead: unknown = LINHA) {
  const falso = criarSupabaseFalso();
  falso.programarResposta("leads", "select", { data: lead, error: null });
  falso.programarResposta("crm_etapas", "select", {
    data: notifica === null ? null : { notifica_lead: notifica },
    error: null,
  });
  vi.mocked(createAdminClient).mockReturnValue(falso.cliente as never);
  return falso;
}

beforeEach(() => {
  vi.clearAllMocks();
  motorOk = true;
});

describe("dispararWhatsAppNovoLead", () => {
  test("lê o lead e agenda a confirmação", async () => {
    preparar(true);
    await dispararWhatsAppNovoLead("lead-1");
    expect(motor.agendarConfirmacao).toHaveBeenCalledWith({
      id: "lead-1",
      tipo: "financiamento",
      nome: "Maria",
      telefone: "19999991234",
      protocolo: "FIN-1",
      consentimentoWhatsappEm: "2026-11-13T12:00:00Z",
    });
  });
  test("nunca lança", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("sem chave");
    });
    await expect(dispararWhatsAppNovoLead("lead-1")).resolves.toBeUndefined();
  });
  test("sem motor não faz nada", async () => {
    motorOk = false;
    await dispararWhatsAppNovoLead("lead-1");
    expect(motor.agendarConfirmacao).not.toHaveBeenCalled();
  });
});

describe("dispararWhatsAppMudancaEtapa", () => {
  test("etapa com notifica_lead agenda o aviso", async () => {
    preparar(true);
    await dispararWhatsAppMudancaEtapa("lead-1", "simulacao", false);
    expect(motor.agendarAvisoEtapa).toHaveBeenCalledWith(expect.objectContaining({ id: "lead-1" }), "simulacao");
    expect(motor.cancelarAvisosEtapa).not.toHaveBeenCalled();
  });
  test("etapa sem notifica_lead só cancela", async () => {
    const falso = preparar(false);
    await dispararWhatsAppMudancaEtapa("lead-1", "simulacao", false);
    expect(motor.cancelarAvisosEtapa).toHaveBeenCalledWith("lead-1");
    expect(motor.agendarAvisoEtapa).not.toHaveBeenCalled();
    const c = falso.chamadas.find((x) => x.tabela === "crm_etapas");
    expect(c?.filtros).toEqual(
      expect.arrayContaining([
        { metodo: "eq", args: ["tipo", "financiamento"] },
        { metodo: "eq", args: ["slug", "simulacao"] },
      ]),
    );
  });
  test("etapa inexistente em crm_etapas só cancela", async () => {
    preparar(null);
    await dispararWhatsAppMudancaEtapa("lead-1", "simulacao", false);
    expect(motor.cancelarAvisosEtapa).toHaveBeenCalledTimes(1);
    expect(motor.agendarAvisoEtapa).not.toHaveBeenCalled();
  });
  test("suprimir só cancela, sem ler nada", async () => {
    const falso = preparar(true);
    await dispararWhatsAppMudancaEtapa("lead-1", "simulacao", true);
    expect(motor.cancelarAvisosEtapa).toHaveBeenCalledWith("lead-1");
    expect(motor.agendarAvisoEtapa).not.toHaveBeenCalled();
    expect(falso.chamadas).toHaveLength(0);
  });
  test("nunca lança", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    preparar(true);
    motor.agendarAvisoEtapa.mockRejectedValueOnce(new Error("boom"));
    await expect(dispararWhatsAppMudancaEtapa("lead-1", "simulacao", false)).resolves.toBeUndefined();
  });
});
