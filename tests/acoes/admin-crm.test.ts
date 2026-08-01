import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  alternarFavorito,
  arquivarLead,
  atribuirResponsavel,
  atualizarLead,
  concluirLembrete,
  criarLead,
  criarTag,
  definirTags,
  excluirLead,
  moverLead,
  reagendarLembrete,
  registrarInteracao,
  restaurarLead,
} from "@/app/actions/admin-crm";

const LEAD_1 = "11111111-1111-4111-8111-111111111111";
const LEAD_2 = "22222222-2222-4222-8222-222222222222";
const LEMBRETE_1 = "33333333-3333-4333-8333-333333333333";
const CORRETOR_1 = "44444444-4444-4444-8444-444444444444";
const IMOVEL_1 = "55555555-5555-4555-8555-555555555555";

function montarSupabase() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  return falso;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("sessão expirada", () => {
  const acoes: Array<[string, () => Promise<unknown>]> = [
    ["moverLead", () => moverLead({ leadId: LEAD_1, etapa: "criado" })],
    ["criarLead", () => criarLead({ tipo: "financiamento", dados: {} })],
    ["atualizarLead", () => atualizarLead({ leadId: LEAD_1, tipo: "financiamento" })],
    ["arquivarLead", () => arquivarLead(LEAD_1)],
    ["restaurarLead", () => restaurarLead(LEAD_1)],
    ["excluirLead", () => excluirLead(LEAD_1)],
    ["registrarInteracao", () => registrarInteracao({ leadId: LEAD_1, tipo: "nota", conteudo: "oi" })],
    ["concluirLembrete", () => concluirLembrete(LEMBRETE_1)],
    ["reagendarLembrete", () => reagendarLembrete(LEMBRETE_1, "2026-01-01T00:00:00.000Z")],
    ["alternarFavorito", () => alternarFavorito(LEAD_1)],
    ["definirTags", () => definirTags(LEAD_1, [])],
    ["atribuirResponsavel", () => atribuirResponsavel(LEAD_1, null)],
    ["criarTag", () => criarTag("Urgente")],
  ];

  test.each(acoes)("%s sem usuário autenticado devolve erro de sessão", async (_nome, chamar) => {
    montarSupabase().definirUsuario(null);
    const resultado = await chamar();
    expect(resultado).toMatchObject({
      sucesso: false,
      erro: "Sessão expirada. Faça login novamente.",
    });
  });
});

describe("moverLead", () => {
  test("dados inválidos (etapa vazia) devolve erro sem chamar o RPC", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await moverLead({ leadId: LEAD_1, etapa: "" as never });

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadasRpc).toEqual([]);
  });

  test("sucesso chama mover_lead_crm e revalida o quadro", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("mover_lead_crm", { data: { id: LEAD_1, status: "simulacao" }, error: null });

    const resultado = await moverLead({ leadId: LEAD_1, etapa: "simulacao" });

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadasRpc.find((c) => c.nome === "mover_lead_crm");
    expect(chamada?.params).toMatchObject({ p_lead_id: LEAD_1, p_etapa: "simulacao" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
  });

  test.each([
    ["LEAD_NAO_ENCONTRADO", "Lead não encontrado."],
    ["LEAD_DESATUALIZADO", "Este lead mudou em outra aba. Atualize a página."],
    ["ETAPA_INVALIDA", "Etapa inválida para este pipeline."],
    ["MOTIVO_OBRIGATORIO", "Selecione um motivo para mover para esta etapa."],
    ["MOTIVO_OBS_OBRIGATORIA", "Descreva o motivo em pelo menos 5 caracteres."],
  ])("traduz a exceção %s do banco", async (codigo, mensagem) => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("mover_lead_crm", { data: null, error: { message: codigo } });

    const resultado = await moverLead({ leadId: LEAD_1, etapa: "perdido", motivo: "preco" });

    expect(resultado).toEqual({ sucesso: false, erro: mensagem });
  });

  test("erro não mapeado devolve mensagem genérica", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("mover_lead_crm", { data: null, error: { message: "algo_desconhecido" } });

    const resultado = await moverLead({ leadId: LEAD_1, etapa: "simulacao" });

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível mover o lead." });
  });

  test("RPC sem erro mas sem dado devolve 'Lead não encontrado.'", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("mover_lead_crm", { data: null, error: null });

    const resultado = await moverLead({ leadId: LEAD_1, etapa: "simulacao" });

    expect(resultado).toEqual({ sucesso: false, erro: "Lead não encontrado." });
  });
});

describe("criarLead", () => {
  function dadosMinimos() {
    return { nome: "Maria Silva", email: "maria@example.com", telefone: "(19) 99783-4187" };
  }

  test("dados inválidos devolve erro sem inserir nada", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await criarLead({ tipo: "financiamento", dados: { nome: "Jo" } });

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadas).toEqual([]);
  });

  test("cria o lead e a linha de detalhe (financiamento) com campos mapeados para snake_case", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "insert", {
      data: { id: "lead-novo", protocolo: "RT-2026-0001" },
      error: null,
    });
    falso.programarResposta("lead_financiamento", "insert", { data: null, error: null });

    const resultado = await criarLead({
      tipo: "financiamento",
      dados: { ...dadosMinimos(), valorImovel: 500_000, percentualEntrada: 20, prazoMeses: 360 },
    });

    expect(resultado).toEqual({ sucesso: true, id: "lead-novo", protocolo: "RT-2026-0001" });

    const chamadaLead = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "insert");
    expect(chamadaLead).toBeDefined();
    const payloadLead = chamadaLead!.payload as Record<string, unknown>;
    expect(payloadLead.status).toBe("criado");
    expect(payloadLead.nome).toBe("Maria Silva");

    const chamadaDetalhe = falso.chamadas.find((c) => c.tabela === "lead_financiamento" && c.operacao === "insert");
    expect(chamadaDetalhe).toBeDefined();
    const payloadDetalhe = chamadaDetalhe!.payload as Record<string, unknown>;
    expect(payloadDetalhe.lead_id).toBe("lead-novo");
    expect(payloadDetalhe.valor_imovel).toBe(500_000);
    expect(payloadDetalhe.percentual_entrada).toBe(20);
    expect(payloadDetalhe.prazo_meses).toBe(360);

    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
  });

  test("tipo imóveis com imovelId grava em leads.imovel_id, não na tabela de detalhe", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "insert", { data: { id: "lead-novo", protocolo: "RT-2026-0002" }, error: null });
    falso.programarResposta("lead_imovel", "insert", { data: null, error: null });

    await criarLead({
      tipo: "imoveis",
      dados: { ...dadosMinimos(), imovelId: IMOVEL_1 },
    });

    const chamadaLead = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "insert");
    expect((chamadaLead!.payload as Record<string, unknown>).imovel_id).toBe(IMOVEL_1);

    const chamadaDetalhe = falso.chamadas.find((c) => c.tabela === "lead_imovel" && c.operacao === "insert");
    expect((chamadaDetalhe!.payload as Record<string, unknown>).imovel_id).toBeUndefined();
  });

  test("erro ao inserir o lead devolve erro genérico e não tenta o detalhe", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "insert", { data: null, error: { message: "falha" } });

    const resultado = await criarLead({ tipo: "financiamento", dados: dadosMinimos() });

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível criar o lead." });
    expect(falso.chamadas.some((c) => c.tabela === "lead_financiamento")).toBe(false);
  });

  test("erro ao inserir o detalhe não desfaz o lead — sucesso com aviso", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "insert", { data: { id: "lead-novo", protocolo: "RT-2026-0003" }, error: null });
    falso.programarResposta("lead_financiamento", "insert", { data: null, error: { message: "falha" } });

    const resultado = await criarLead({ tipo: "financiamento", dados: dadosMinimos() });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.id).toBe("lead-novo");
    expect(resultado.erro).toMatch(/campos específicos/);
  });
});

describe("atualizarLead", () => {
  test("leadId inválido devolve erro sem consultar o banco", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await atualizarLead({ leadId: "não-é-uuid", tipo: "financiamento" });

    expect(resultado).toEqual({ sucesso: false, erro: "Lead inválido." });
    expect(falso.chamadas).toEqual([]);
  });

  test("atualiza dados comuns e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "update", { data: [{ id: LEAD_1 }], error: null });

    const resultado = await atualizarLead({
      leadId: LEAD_1,
      tipo: "financiamento",
      comum: { nome: "Novo Nome" },
    });

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).nome).toBe("Novo Nome");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
  });

  test("update comum que não casa nenhuma linha devolve erro de permissão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "update", { data: [], error: null });

    const resultado = await atualizarLead({
      leadId: LEAD_1,
      tipo: "financiamento",
      comum: { nome: "Novo Nome" },
    });

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para editá-lo.",
    });
  });

  test("origem sem linha existente insere (upsert manual)", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("lead_financiamento", "select", { data: null, error: null });
    falso.programarResposta("lead_financiamento", "insert", { data: null, error: null });

    const resultado = await atualizarLead({
      leadId: LEAD_1,
      tipo: "financiamento",
      origem: { bancoSimulado: "Banco X" },
    });

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "lead_financiamento" && c.operacao === "insert");
    expect(chamada).toBeDefined();
    expect((chamada!.payload as Record<string, unknown>).lead_id).toBe(LEAD_1);
    expect((chamada!.payload as Record<string, unknown>).banco_simulado).toBe("Banco X");
  });

  test("origem com linha existente atualiza em vez de inserir", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("lead_financiamento", "select", { data: { lead_id: LEAD_1 }, error: null });
    falso.programarResposta("lead_financiamento", "update", { data: null, error: null });

    const resultado = await atualizarLead({
      leadId: LEAD_1,
      tipo: "financiamento",
      origem: { bancoSimulado: "Banco Y" },
    });

    expect(resultado).toEqual({ sucesso: true });
    const chamadaUpdate = falso.chamadas.find((c) => c.tabela === "lead_financiamento" && c.operacao === "update");
    expect(chamadaUpdate).toBeDefined();
    const chamadaInsert = falso.chamadas.find((c) => c.tabela === "lead_financiamento" && c.operacao === "insert");
    expect(chamadaInsert).toBeUndefined();
  });

  test("origem inválida devolve erro sem tocar no banco", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await atualizarLead({
      leadId: LEAD_1,
      tipo: "financiamento",
      origem: { prazoMeses: 99999 },
    });

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadas.some((c) => c.tabela === "lead_financiamento")).toBe(false);
  });
});

describe("arquivarLead / restaurarLead", () => {
  test("arquivarLead grava arquivado_em/arquivado_por e revalida quadro + arquivados", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "update", { data: [{ id: LEAD_1 }], error: null });

    const resultado = await arquivarLead(LEAD_1);

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    const payload = chamada!.payload as Record<string, unknown>;
    expect(payload.arquivado_em).toBeTruthy();
    expect(payload.arquivado_por).toBe("user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/arquivados");
  });

  test("arquivarLead sem linha afetada devolve erro de permissão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "update", { data: [], error: null });

    const resultado = await arquivarLead(LEAD_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para arquivá-lo.",
    });
  });

  test("restaurarLead limpa arquivado_em/arquivado_por", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "update", { data: [{ id: LEAD_1 }], error: null });

    const resultado = await restaurarLead(LEAD_1);

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    const payload = chamada!.payload as Record<string, unknown>;
    expect(payload.arquivado_em).toBeNull();
    expect(payload.arquivado_por).toBeNull();
  });

  test("restaurarLead sem linha afetada devolve erro de permissão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "update", { data: [], error: null });

    const resultado = await restaurarLead(LEAD_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para restaurá-lo.",
    });
  });
});

describe("excluirLead", () => {
  test("corretor (não admin) não pode excluir", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("profiles", "select", { data: { role: "corretor" }, error: null });

    const resultado = await excluirLead(LEAD_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Somente administradores podem excluir leads definitivamente.",
    });
    expect(falso.chamadas.some((c) => c.tabela === "crm_exclusoes")).toBe(false);
    expect(falso.chamadas.some((c) => c.tabela === "leads" && c.operacao === "delete")).toBe(false);
  });

  test("admin: grava crm_exclusoes ANTES do delete, e revalida quadro + arquivados", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "admin-1" });
    falso.programarResposta("profiles", "select", { data: { role: "admin" }, error: null });
    falso.programarResposta("leads", "select", { data: { protocolo: "RT-2026-0009", tipo: "financiamento" }, error: null });
    falso.programarResposta("crm_exclusoes", "insert", { data: null, error: null });
    falso.programarResposta("leads", "delete", { data: [{ id: LEAD_1 }], error: null });

    const resultado = await excluirLead(LEAD_1, "pedido do titular");

    expect(resultado).toEqual({ sucesso: true });

    const indiceInsert = falso.chamadas.findIndex((c) => c.tabela === "crm_exclusoes" && c.operacao === "insert");
    const indiceDelete = falso.chamadas.findIndex((c) => c.tabela === "leads" && c.operacao === "delete");
    expect(indiceInsert).toBeGreaterThanOrEqual(0);
    expect(indiceDelete).toBeGreaterThan(indiceInsert);

    const payloadExclusao = falso.chamadas[indiceInsert].payload as Record<string, unknown>;
    expect(payloadExclusao).toMatchObject({
      protocolo: "RT-2026-0009",
      tipo: "financiamento",
      excluido_por: "admin-1",
      motivo: "pedido do titular",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/arquivados");
  });

  test("lead não encontrado devolve erro sem gravar exclusão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "admin-1" });
    falso.programarResposta("profiles", "select", { data: { role: "admin" }, error: null });
    falso.programarResposta("leads", "select", { data: null, error: null });

    const resultado = await excluirLead(LEAD_1);

    expect(resultado).toEqual({ sucesso: false, erro: "Lead não encontrado." });
    expect(falso.chamadas.some((c) => c.tabela === "crm_exclusoes")).toBe(false);
  });

  test("delete que não casa linha nenhuma devolve erro de permissão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "admin-1" });
    falso.programarResposta("profiles", "select", { data: { role: "admin" }, error: null });
    falso.programarResposta("leads", "select", { data: { protocolo: "RT-2026-0009", tipo: "financiamento" }, error: null });
    falso.programarResposta("crm_exclusoes", "insert", { data: null, error: null });
    falso.programarResposta("leads", "delete", { data: [], error: null });

    const resultado = await excluirLead(LEAD_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para excluí-lo.",
    });
  });
});

describe("registrarInteracao", () => {
  test("conteúdo vazio devolve erro sem chamar o RPC", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await registrarInteracao({ leadId: LEAD_1, tipo: "nota", conteudo: "" });

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadasRpc).toEqual([]);
  });

  test("sucesso sem lembrete envia p_lembrete_em/p_lembrete_desc nulos", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("registrar_interacao_crm", { data: { id: "int-1" }, error: null });

    const resultado = await registrarInteracao({ leadId: LEAD_1, tipo: "ligacao", conteudo: "Cliente retornou." });

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadasRpc.find((c) => c.nome === "registrar_interacao_crm");
    expect(chamada?.params).toMatchObject({ p_lembrete_em: null, p_lembrete_desc: null });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
  });

  test("sucesso com lembrete envia data e descrição", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("registrar_interacao_crm", { data: { id: "int-2" }, error: null });
    const futuro = new Date(Date.now() + 86_400_000).toISOString();

    await registrarInteracao({
      leadId: LEAD_1,
      tipo: "ligacao",
      conteudo: "Cliente pediu retorno.",
      lembrete: { agendadoPara: futuro, descricao: "Ligar de novo" },
    });

    const chamada = falso.chamadasRpc.find((c) => c.nome === "registrar_interacao_crm");
    expect(chamada?.params).toMatchObject({ p_lembrete_em: futuro, p_lembrete_desc: "Ligar de novo" });
  });

  test("traduz LEMBRETE_DESCRICAO_OBRIGATORIA do banco", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("registrar_interacao_crm", { data: null, error: { message: "LEMBRETE_DESCRICAO_OBRIGATORIA" } });

    const resultado = await registrarInteracao({ leadId: LEAD_1, tipo: "nota", conteudo: "Nota qualquer." });

    expect(resultado).toEqual({ sucesso: false, erro: "Descreva o lembrete." });
  });

  test("RPC sem erro mas sem dado devolve erro genérico", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc("registrar_interacao_crm", { data: null, error: null });

    const resultado = await registrarInteracao({ leadId: LEAD_1, tipo: "nota", conteudo: "Nota qualquer." });

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível registrar a interação." });
  });
});

describe("concluirLembrete / reagendarLembrete", () => {
  test("concluirLembrete grava concluido/concluido_em/concluido_por", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("crm_lembretes", "update", { data: [{ id: LEMBRETE_1 }], error: null });

    const resultado = await concluirLembrete(LEMBRETE_1);

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "crm_lembretes" && c.operacao === "update");
    const payload = chamada!.payload as Record<string, unknown>;
    expect(payload.concluido).toBe(true);
    expect(payload.concluido_por).toBe("user-1");
  });

  test("concluirLembrete com id inválido devolve erro sem tocar no banco", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await concluirLembrete("não-é-uuid");

    expect(resultado).toEqual({ sucesso: false, erro: "Lembrete inválido." });
    expect(falso.chamadas).toEqual([]);
  });

  test("concluirLembrete sem linha afetada devolve erro de permissão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("crm_lembretes", "update", { data: [], error: null });

    const resultado = await concluirLembrete(LEMBRETE_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lembrete não encontrado ou você não tem permissão para alterá-lo.",
    });
  });

  test("reagendarLembrete grava a nova data", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("crm_lembretes", "update", { data: [{ id: LEMBRETE_1 }], error: null });

    const novaData = "2026-01-01T10:00:00.000Z";
    const resultado = await reagendarLembrete(LEMBRETE_1, novaData);

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "crm_lembretes" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).agendado_para).toBe(novaData);
  });

  test("reagendarLembrete com data em formato inválido devolve erro", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await reagendarLembrete(LEMBRETE_1, "não é uma data");

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadas).toEqual([]);
  });
});

describe("alternarFavorito", () => {
  test("de false para true", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: { favorito: false }, error: null });
    falso.programarResposta("leads", "update", { data: [{ id: LEAD_1 }], error: null });

    const resultado = await alternarFavorito(LEAD_1);

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).favorito).toBe(true);
  });

  test("de true para false", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: { favorito: true }, error: null });
    falso.programarResposta("leads", "update", { data: [{ id: LEAD_1 }], error: null });

    await alternarFavorito(LEAD_1);

    const chamada = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).favorito).toBe(false);
  });

  test("lead não encontrado (ou fora do alcance da RLS) devolve erro", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: null, error: null });

    const resultado = await alternarFavorito(LEAD_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para acessá-lo.",
    });
  });

  test("update sem linha afetada devolve erro de permissão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: { favorito: false }, error: null });
    falso.programarResposta("leads", "update", { data: [], error: null });

    const resultado = await alternarFavorito(LEAD_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para alterá-lo.",
    });
  });
});

describe("definirTags", () => {
  test("mais de 8 tags devolve erro sem tocar no banco", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await definirTags(LEAD_1, ["a", "b", "c", "d", "e", "f", "g", "h", "i"]);

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadas).toEqual([]);
  });

  test("lead não encontrado (ou fora do alcance da RLS) devolve erro", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: null, error: null });

    const resultado = await definirTags(LEAD_1, ["urgente"]);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para acessá-lo.",
    });
  });

  test("lista vazia substitui por nada: deleta e não insere", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: { id: LEAD_1 }, error: null });
    falso.programarResposta("lead_tags", "delete", { data: null, error: null });

    const resultado = await definirTags(LEAD_1, []);

    expect(resultado).toEqual({ sucesso: true });
    expect(falso.chamadas.some((c) => c.tabela === "lead_tags" && c.operacao === "delete")).toBe(true);
    expect(falso.chamadas.some((c) => c.tabela === "lead_tags" && c.operacao === "insert")).toBe(false);
  });

  test("substitui o conjunto: deleta tudo e insere as novas", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: { id: LEAD_1 }, error: null });
    falso.programarResposta("lead_tags", "delete", { data: null, error: null });
    falso.programarResposta("lead_tags", "insert", { data: null, error: null });

    const resultado = await definirTags(LEAD_1, ["urgente", "capital-de-giro"]);

    expect(resultado).toEqual({ sucesso: true });
    const chamadaInsert = falso.chamadas.find((c) => c.tabela === "lead_tags" && c.operacao === "insert");
    expect(chamadaInsert!.payload).toEqual([
      { lead_id: LEAD_1, tag_slug: "urgente" },
      { lead_id: LEAD_1, tag_slug: "capital-de-giro" },
    ]);
  });

  test("erro ao deletar devolve mensagem específica", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("leads", "select", { data: { id: LEAD_1 }, error: null });
    falso.programarResposta("lead_tags", "delete", { data: null, error: { message: "falha" } });

    const resultado = await definirTags(LEAD_1, []);

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível atualizar as tags." });
  });
});

describe("atribuirResponsavel", () => {
  test("corretorId inválido devolve erro sem tocar no banco", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await atribuirResponsavel(LEAD_1, "não-é-uuid");

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadas).toEqual([]);
  });

  test("sucesso ao assumir um lead sem dono (null -> corretor)", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: CORRETOR_1 });
    falso.programarResposta("leads", "update", { data: [{ id: LEAD_1 }], error: null });

    const resultado = await atribuirResponsavel(LEAD_1, CORRETOR_1);

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).corretor_id).toBe(CORRETOR_1);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
  });

  test("null desatribui (largar o lead)", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "admin-1" });
    falso.programarResposta("leads", "update", { data: [{ id: LEAD_1 }], error: null });

    await atribuirResponsavel(LEAD_1, null);

    const chamada = falso.chamadas.find((c) => c.tabela === "leads" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).corretor_id).toBeNull();
  });

  test("traduz ATRIBUICAO_NAO_PERMITIDA (trigger trg_leads_atribuicao)", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: CORRETOR_1 });
    falso.programarResposta("leads", "update", { data: null, error: { message: "ATRIBUICAO_NAO_PERMITIDA" } });

    const resultado = await atribuirResponsavel(LEAD_1, LEAD_2);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Você não tem permissão para reatribuir este lead.",
    });
  });

  test("update sem linha afetada (fora do alcance da RLS) devolve erro de permissão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: CORRETOR_1 });
    falso.programarResposta("leads", "update", { data: [], error: null });

    const resultado = await atribuirResponsavel(LEAD_1, CORRETOR_1);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Lead não encontrado ou você não tem permissão para reatribuí-lo.",
    });
  });
});

describe("criarTag", () => {
  test("label curto demais devolve erro sem tocar no banco", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await criarTag("a");

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadas).toEqual([]);
  });

  test("slug já existente devolve a tag existente sem inserir", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("crm_tags", "select", {
      data: [{ slug: "urgente", label: "Urgente", cor: "#8A3B2E", ordem: 2 }],
      error: null,
    });

    const resultado = await criarTag("urgente");

    expect(resultado).toEqual({
      sucesso: true,
      tag: { slug: "urgente", label: "Urgente", cor: "#8A3B2E" },
    });
    expect(falso.chamadas.some((c) => c.tabela === "crm_tags" && c.operacao === "insert")).toBe(false);
  });

  test("caminho feliz: cria a tag com ordem = maior ordem atual + 1 e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "admin-1" });
    falso.programarResposta("crm_tags", "select", {
      data: [{ slug: "vip", label: "VIP", cor: "#1C4633", ordem: 3 }],
      error: null,
    });
    falso.programarResposta("crm_tags", "insert", {
      data: { slug: "parceiro", label: "Parceiro", cor: "#8A6C48" },
      error: null,
    });

    const resultado = await criarTag("Parceiro");

    expect(resultado).toEqual({
      sucesso: true,
      tag: { slug: "parceiro", label: "Parceiro", cor: "#8A6C48" },
    });
    const chamadaInsert = falso.chamadas.find((c) => c.tabela === "crm_tags" && c.operacao === "insert");
    expect(chamadaInsert).toBeDefined();
    expect(chamadaInsert!.payload).toMatchObject({ slug: "parceiro", label: "Parceiro", ordem: 4 });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/crm/[origem]", "page");
  });

  test("catálogo vazio: primeira tag nasce com ordem 1", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "admin-1" });
    falso.programarResposta("crm_tags", "select", { data: [], error: null });
    falso.programarResposta("crm_tags", "insert", {
      data: { slug: "prioridade", label: "Prioridade", cor: "#8A6C48" },
      error: null,
    });

    await criarTag("Prioridade");

    const chamadaInsert = falso.chamadas.find((c) => c.tabela === "crm_tags" && c.operacao === "insert");
    expect(chamadaInsert!.payload).toMatchObject({ ordem: 1 });
  });

  test("RLS barra corretor não-admin: erro 42501 vira mensagem clara", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "corretor-1" });
    falso.programarResposta("crm_tags", "select", { data: [], error: null });
    falso.programarResposta("crm_tags", "insert", {
      data: null,
      error: { message: "new row violates row-level security policy for table \"crm_tags\"", code: "42501" },
    });

    const resultado = await criarTag("Nova tag");

    expect(resultado).toEqual({ sucesso: false, erro: "Só administradores podem criar tags novas." });
  });
});
