import { describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";
import type { Emailer } from "@/lib/email/enviar";
import {
  cancelarAgendados,
  enviarSimulacaoAoLead,
  notificarMudancaEtapa,
  notificarNovoLead,
  type DependenciasEmail,
} from "@/lib/email/notificar";

const AGORA = new Date("2026-03-01T12:00:00.000Z");
const LEAD = {
  id: "11111111-1111-4111-8111-111111111111",
  tipo: "financiamento" as const,
  nome: "Maria Silva",
  email: "maria@example.com",
  telefone: "(19) 99783-4187",
  protocolo: "RT-1",
};

function montar(opcoes: { semChave?: boolean } = {}) {
  const falso = criarSupabaseFalso();
  const enviar = vi.fn(async (e: { para: string; texto?: string }) =>
    opcoes.semChave
      ? ({ enviado: false, motivo: "sem-chave" } as const)
      : ({ enviado: true, id: `re_${e.para}` } as const),
  );
  const cancelar = vi.fn(async () => ({ cancelado: true }) as const);
  const emailer = { enviar, cancelar } as unknown as Emailer;
  const deps: DependenciasEmail = {
    admin: falso.cliente as never,
    emailer,
    emailAdmin: "dono@rt.com",
    agora: () => AGORA,
  };
  return { falso, enviar, cancelar, deps };
}

function insercoes(falso: ReturnType<typeof criarSupabaseFalso>) {
  return falso.chamadas.filter((c) => c.tabela === "crm_emails" && c.operacao === "insert").map((c) => c.payload);
}

describe("notificarNovoLead", () => {
  test("envia ao dono e ao lead e registra as duas linhas", async () => {
    const { falso, enviar, deps } = montar();

    await notificarNovoLead(deps, LEAD, [{ rotulo: "Cidade", valor: "Vinhedo" }]);

    expect(enviar).toHaveBeenCalledTimes(2);
    expect(enviar.mock.calls.map((c) => c[0].para).sort()).toEqual(["dono@rt.com", "maria@example.com"]);
    expect(insercoes(falso)).toEqual([
      expect.objectContaining({
        lead_id: LEAD.id,
        tipo: "novo-lead-admin",
        destinatario: "dono@rt.com",
        status: "enviado",
        resend_id: "re_dono@rt.com",
      }),
      expect.objectContaining({
        lead_id: LEAD.id,
        tipo: "novo-lead-lead",
        destinatario: "maria@example.com",
        status: "enviado",
      }),
    ]);
  });

  test("sem chave registra sem-chave nas duas linhas", async () => {
    const { falso, deps } = montar({ semChave: true });
    await notificarNovoLead(deps, LEAD, []);
    expect(insercoes(falso).map((p) => (p as { status: string }).status)).toEqual(["sem-chave", "sem-chave"]);
  });

  test("sem EMAIL_ADMIN ainda confirma ao lead e registra falhou para o dono", async () => {
    const { falso, enviar, deps } = montar();
    await notificarNovoLead({ ...deps, emailAdmin: undefined }, LEAD, []);
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(insercoes(falso)[0]).toMatchObject({
      tipo: "novo-lead-admin",
      status: "falhou",
      erro: "EMAIL_ADMIN ausente",
    });
  });
});

describe("notificarMudancaEtapa", () => {
  const mudanca = { lead: LEAD, de: "criado" as const, para: "simulacao" as const, quemMoveu: "Rafael" };

  test("avisa o dono na hora e agenda o do lead +10 min quando a etapa notifica", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: true }, error: null });

    await notificarMudancaEtapa(deps, mudanca);

    const paraDono = enviar.mock.calls.find((c) => c[0].para === "dono@rt.com")![0] as { agendarPara?: Date };
    const paraLead = enviar.mock.calls.find((c) => c[0].para === "maria@example.com")![0] as { agendarPara?: Date };
    expect(paraDono.agendarPara).toBeUndefined();
    expect(paraLead.agendarPara).toEqual(new Date("2026-03-01T12:10:00.000Z"));
    expect(insercoes(falso)).toEqual([
      expect.objectContaining({ tipo: "etapa-admin", status: "enviado" }),
      expect.objectContaining({
        tipo: "etapa-lead",
        etapa: "simulacao",
        status: "agendado",
        resend_id: "re_maria@example.com",
        agendado_para: "2026-03-01T12:10:00.000Z",
      }),
    ]);
  });

  test("etapa sem notifica_lead só avisa o dono", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: false }, error: null });

    await notificarMudancaEtapa(deps, mudanca);

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0][0].para).toBe("dono@rt.com");
  });

  test("notifica_lead ligado numa etapa sem texto não envia nada ao lead", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: true }, error: null });

    await notificarMudancaEtapa(deps, { ...mudanca, para: "perdido" });

    expect(enviar.mock.calls.map((c) => c[0].para)).toEqual(["dono@rt.com"]);
  });

  test("mover de novo dentro da janela cancela o agendado antes de agendar o novo", async () => {
    const { falso, enviar, cancelar, deps } = montar();
    falso.programarResposta("crm_emails", "select", {
      data: [{ id: "row-1", resend_id: "re_antigo", agendado_para: "2026-03-01T12:05:00.000Z" }],
      error: null,
    });
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: true }, error: null });

    await notificarMudancaEtapa(deps, mudanca);

    expect(cancelar).toHaveBeenCalledWith("re_antigo");
    const atualizacao = falso.chamadas.find((c) => c.tabela === "crm_emails" && c.operacao === "update");
    expect(atualizacao?.payload).toEqual({ status: "cancelado" });
    expect(atualizacao?.filtros).toContainEqual({ metodo: "eq", args: ["id", "row-1"] });
    expect(cancelar.mock.invocationCallOrder[0]).toBeLessThan(enviar.mock.invocationCallOrder[0]);
  });

  test("etapa que nao notifica tambem cancela o agendado (arrastou e desfez)", async () => {
    const { falso, cancelar, deps } = montar();
    falso.programarResposta("crm_emails", "select", {
      data: [{ id: "row-1", resend_id: "re_antigo", agendado_para: "2026-03-01T12:05:00.000Z" }],
      error: null,
    });
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: false }, error: null });

    await notificarMudancaEtapa(deps, { ...mudanca, para: "criado", de: "simulacao" });

    expect(cancelar).toHaveBeenCalledWith("re_antigo");
  });

  test("inclui o motivo no e-mail ao dono", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: false }, error: null });
    falso.programarResposta("crm_motivos_perda", "select", { data: { label: "Sem interesse" }, error: null });

    await notificarMudancaEtapa(deps, { ...mudanca, para: "perdido", motivo: "sem-interesse", motivoObs: "não atende" });

    const e = enviar.mock.calls[0][0] as { texto: string };
    expect(e.texto).toContain("Sem interesse");
    expect(e.texto).toContain("não atende");
  });
});

describe("cancelarAgendados", () => {
  test("ignora quem já passou do horário e não marca cancelado se o Resend recusar", async () => {
    const { falso, cancelar, deps } = montar();
    falso.programarResposta("crm_emails", "select", {
      data: [
        { id: "velho", resend_id: "re_velho", agendado_para: "2026-03-01T11:00:00.000Z" },
        { id: "novo", resend_id: "re_novo", agendado_para: "2026-03-01T12:05:00.000Z" },
      ],
      error: null,
    });
    cancelar.mockResolvedValueOnce({ cancelado: false, erro: "já enviado" } as never);

    await cancelarAgendados(deps, LEAD.id);

    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(cancelar).toHaveBeenCalledWith("re_novo");
    expect(falso.chamadas.some((c) => c.tabela === "crm_emails" && c.operacao === "update")).toBe(false);
  });
});

describe("notificarMudancaEtapa com suprimirAvisoLead", () => {
  const mudanca = { lead: LEAD, de: "criado" as const, para: "simulacao" as const, quemMoveu: "Rafael" };

  test("não agenda o aviso ao lead, mas avisa o dono e cancela o agendado anterior", async () => {
    const { falso, enviar, cancelar, deps } = montar();
    falso.programarResposta("crm_emails", "select", {
      data: [{ id: "row-1", resend_id: "re_antigo", agendado_para: "2026-03-01T12:05:00.000Z" }],
      error: null,
    });
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: true }, error: null });

    await notificarMudancaEtapa(deps, { ...mudanca, suprimirAvisoLead: true });

    expect(cancelar).toHaveBeenCalledWith("re_antigo");
    expect(enviar.mock.calls.map((c) => c[0].para)).toEqual(["dono@rt.com"]);
    expect(insercoes(falso)).toEqual([expect.objectContaining({ tipo: "etapa-admin" })]);
  });

  test("sem a opção, o aviso ao lead segue normal", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_etapas", "select", { data: { notifica_lead: true }, error: null });
    await notificarMudancaEtapa(deps, mudanca);
    expect(enviar.mock.calls.map((c) => c[0].para).sort()).toEqual(["dono@rt.com", "maria@example.com"]);
  });
});

describe("enviarSimulacaoAoLead", () => {
  const PDF = Buffer.from("%PDF-ficticio");

  test("cancela os agendados, envia na hora com o anexo e registra tipo simulacao", async () => {
    const { falso, enviar, cancelar, deps } = montar();
    falso.programarResposta("crm_emails", "select", {
      data: [{ id: "row-1", resend_id: "re_antigo", agendado_para: "2026-03-01T12:05:00.000Z" }],
      error: null,
    });

    const r = await enviarSimulacaoAoLead(deps, LEAD, PDF, "Simulacao-RT-RT-1.pdf");

    expect(cancelar).toHaveBeenCalledWith("re_antigo");
    expect(enviar).toHaveBeenCalledTimes(1);
    const email = enviar.mock.calls[0][0] as { para: string; agendarPara?: Date; anexos?: { nome: string; conteudo: Buffer }[]; assunto: string };
    expect(email.para).toBe("maria@example.com");
    expect(email.agendarPara).toBeUndefined();
    expect(email.anexos).toEqual([{ nome: "Simulacao-RT-RT-1.pdf", conteudo: PDF }]);
    expect(email.assunto).toContain("RT-1");
    expect(r).toEqual({ status: "enviado", resendId: "re_maria@example.com", erro: null });
    expect(insercoes(falso)).toEqual([
      expect.objectContaining({ lead_id: LEAD.id, tipo: "simulacao", destinatario: "maria@example.com", status: "enviado" }),
    ]);
  });

  test("falha do provedor vira status falhou, sem lançar", async () => {
    const { falso, enviar, deps } = montar();
    enviar.mockResolvedValueOnce({ enviado: false, motivo: "falha", erro: "domínio não verificado" } as never);
    const r = await enviarSimulacaoAoLead(deps, LEAD, PDF, "x.pdf");
    expect(r).toEqual({ status: "falhou", resendId: null, erro: "domínio não verificado" });
    expect(insercoes(falso)[0]).toMatchObject({ tipo: "simulacao", status: "falhou", erro: "domínio não verificado" });
  });

  test("sem chave: status sem-chave", async () => {
    const { deps } = montar({ semChave: true });
    expect((await enviarSimulacaoAoLead(deps, LEAD, PDF, "x.pdf")).status).toBe("sem-chave");
  });
});
