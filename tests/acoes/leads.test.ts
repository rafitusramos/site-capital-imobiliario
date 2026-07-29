import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarLead, type CriarLeadInput } from "@/app/actions/leads";

function mockHeaders(valores: Record<string, string> = {}) {
  vi.mocked(headers).mockResolvedValue({
    get: (nome: string) => valores[nome] ?? null,
  } as never);
}

function montarAdmin() {
  const falso = criarSupabaseFalso();
  vi.mocked(createAdminClient).mockReturnValue(falso.cliente as never);
  return falso;
}

function dadosFinanciamento() {
  return {
    nome: "Maria Silva",
    email: "maria@example.com",
    telefone: "(19) 99783-4187",
    renda: 8000,
    tipoRemuneracao: "Assalariado",
    entradaDisponivel: 100000,
    usaFgts: true,
    valorImovel: 500000,
    momentoCompra: "Já escolhi o imóvel",
    tipoImovel: "Apartamento",
    cidade: "Vinhedo",
    estado: "sp",
    percentualEntrada: 20,
    valorCredito: 400000,
    prazoMeses: 360,
    parcelaEstimada: 4000,
  };
}

function dadosHomeEquity() {
  return {
    nome: "João Souza",
    email: "joao@example.com",
    telefone: "(19) 99783-4187",
    renda: 10000,
    tipoRemuneracao: "Assalariado",
    objetivoCredito: "Investir no meu negócio",
    tipoImovel: "Casa",
    cep: "13280-000",
    numero: "123",
    areaM2: 120,
    valorImovel: 600000,
    imovelQuitado: true,
    valorCreditoEstimado: 300000,
    prazoMeses: 180,
    parcelaEstimada: 3000,
  };
}

function dadosImovel() {
  return {
    nome: "Ana Costa",
    email: "ana@example.com",
    telefone: "(19) 99783-4187",
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("criarLead — honeypot", () => {
  test("honeypot preenchido devolve sucesso vazio sem chamar o Supabase", async () => {
    const falso = montarAdmin();
    mockHeaders();

    const resultado = await criarLead({
      tipo: "financiamento",
      dados: { qualquerCoisa: "lixo" },
      paginaUrl: "/financiamento",
      honeypot: "bot preencheu isso",
    });

    expect(resultado).toEqual({ sucesso: true, protocolo: "" });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(falso.chamadasRpc).toEqual([]);
  });
});

describe("criarLead — validação", () => {
  test("dados que reprovam no schema devolvem erro genérico sem chamar RPC de criação", async () => {
    const falso = montarAdmin();
    mockHeaders();

    const resultado = await criarLead({
      tipo: "financiamento",
      dados: { nome: "Jo" }, // nome curto, faltam campos obrigatórios
      paginaUrl: "/financiamento",
    });

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Dados inválidos. Revise o formulário.",
    });
    expect(falso.chamadasRpc.some((c) => c.nome.startsWith("criar_lead_"))).toBe(false);
  });
});

describe("criarLead — rate limit", () => {
  test("rate limit reprovado devolve erro sem chamar a RPC de criação", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", { data: false, error: null });

    const resultado = await criarLead({
      tipo: "financiamento",
      dados: dadosFinanciamento(),
      paginaUrl: "/financiamento",
    });

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Muitas tentativas. Tente novamente em instantes.",
    });
    expect(falso.chamadasRpc.some((c) => c.nome === "criar_lead_financiamento")).toBe(false);
  });

  test("rate limit retornando erro faz a action lançar", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", {
      data: null,
      error: new Error("falha ao checar rate limit"),
    });

    await expect(
      criarLead({
        tipo: "financiamento",
        dados: dadosFinanciamento(),
        paginaUrl: "/financiamento",
      }),
    ).rejects.toThrow("falha ao checar rate limit");
  });
});

describe("criarLead — sucesso por tipo", () => {
  test("financiamento: chama a RPC certa com origem e telefone normalizados", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
    falso.programarRpc("criar_lead_financiamento", {
      data: { id: "lead-1", protocolo: "FIN-0001", nome: "Maria Silva", telefone: "19997834187" },
      error: null,
    });

    const resultado = await criarLead({
      tipo: "financiamento",
      dados: dadosFinanciamento(),
      paginaUrl: "/financiamento",
    });

    expect(resultado).toEqual({ sucesso: true, protocolo: "FIN-0001" });
    const chamada = falso.chamadasRpc.find((c) => c.nome === "criar_lead_financiamento");
    expect(chamada).toBeDefined();
    const params = chamada!.params as Record<string, unknown>;
    expect(params.p_origem).toBe("lp-financiamento-sbpe");
    expect(params.p_telefone).toBe("19997834187");
    expect(params.p_cpf).toBeNull();
  });

  test("home-equity: chama a RPC certa com origem e telefone normalizados", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
    falso.programarRpc("criar_lead_home_equity", {
      data: { id: "lead-2", protocolo: "HE-0001", nome: "João Souza", telefone: "19997834187" },
      error: null,
    });

    const resultado = await criarLead({
      tipo: "home-equity",
      dados: dadosHomeEquity(),
      paginaUrl: "/home_equity",
    });

    expect(resultado).toEqual({ sucesso: true, protocolo: "HE-0001" });
    const chamada = falso.chamadasRpc.find((c) => c.nome === "criar_lead_home_equity");
    expect(chamada).toBeDefined();
    const params = chamada!.params as Record<string, unknown>;
    expect(params.p_origem).toBe("lp-home-equity");
    expect(params.p_telefone).toBe("19997834187");
    expect(params.p_cpf).toBeNull();
  });

  test("imóvel: chama a RPC certa com origem e telefone normalizados", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
    falso.programarRpc("criar_lead_imovel", {
      data: { id: "lead-3", protocolo: "IMV-0001", nome: "Ana Costa", telefone: "19997834187" },
      error: null,
    });

    const resultado = await criarLead({
      tipo: "imoveis",
      dados: dadosImovel(),
      paginaUrl: "/imoveis/residencial-x",
    });

    expect(resultado).toEqual({ sucesso: true, protocolo: "IMV-0001" });
    const chamada = falso.chamadasRpc.find((c) => c.nome === "criar_lead_imovel");
    expect(chamada).toBeDefined();
    const params = chamada!.params as Record<string, unknown>;
    expect(params.p_origem).toBe("lp-imovel");
    expect(params.p_telefone).toBe("19997834187");
    expect(params.p_cpf).toBeNull();
  });
});

describe("criarLead — IP", () => {
  function montarInput(): CriarLeadInput {
    return { tipo: "financiamento", dados: dadosFinanciamento(), paginaUrl: "/financiamento" };
  }

  function programarSucesso(falso: ReturnType<typeof criarSupabaseFalso>) {
    falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
    falso.programarRpc("criar_lead_financiamento", {
      data: { id: "lead-1", protocolo: "FIN-0001" },
      error: null,
    });
  }

  // O IP só é enviado à RPC de rate limit (registrar_tentativa_lead) — as RPCs
  // de criação de lead (criar_lead_*) não recebem p_ip.
  test("usa o primeiro IP de x-forwarded-for", async () => {
    const falso = montarAdmin();
    mockHeaders({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });
    programarSucesso(falso);

    await criarLead(montarInput());

    const chamada = falso.chamadasRpc.find((c) => c.nome === "registrar_tentativa_lead");
    expect((chamada!.params as Record<string, unknown>).p_ip).toBe("203.0.113.7");
  });

  test("usa x-real-ip quando x-forwarded-for está ausente", async () => {
    const falso = montarAdmin();
    mockHeaders({ "x-real-ip": "198.51.100.9" });
    programarSucesso(falso);

    await criarLead(montarInput());

    const chamada = falso.chamadasRpc.find((c) => c.nome === "registrar_tentativa_lead");
    expect((chamada!.params as Record<string, unknown>).p_ip).toBe("198.51.100.9");
  });

  test("usa 'desconhecido' quando nenhum header de IP está presente", async () => {
    const falso = montarAdmin();
    mockHeaders();
    programarSucesso(falso);

    await criarLead(montarInput());

    const chamada = falso.chamadasRpc.find((c) => c.nome === "registrar_tentativa_lead");
    expect((chamada!.params as Record<string, unknown>).p_ip).toBe("desconhecido");
  });
});

describe("criarLead — RPC de criação com problema", () => {
  test("erro na RPC de criação faz a action lançar", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
    falso.programarRpc("criar_lead_financiamento", {
      data: null,
      error: new Error("constraint violation"),
    });

    await expect(
      criarLead({ tipo: "financiamento", dados: dadosFinanciamento(), paginaUrl: "/financiamento" }),
    ).rejects.toThrow("constraint violation");
  });

  test("RPC sem erro mas sem dados faz a action lançar mensagem específica", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
    falso.programarRpc("criar_lead_financiamento", { data: null, error: null });

    await expect(
      criarLead({ tipo: "financiamento", dados: dadosFinanciamento(), paginaUrl: "/financiamento" }),
    ).rejects.toThrow("RPC de criação de lead não retornou dados.");
  });
});

describe("criarLead — UTM", () => {
  test("utm ausente vira objeto vazio no parâmetro p_utm", async () => {
    const falso = montarAdmin();
    mockHeaders();
    falso.programarRpc("registrar_tentativa_lead", { data: true, error: null });
    falso.programarRpc("criar_lead_financiamento", {
      data: { id: "lead-1", protocolo: "FIN-0001" },
      error: null,
    });

    await criarLead({ tipo: "financiamento", dados: dadosFinanciamento(), paginaUrl: "/financiamento" });

    const chamada = falso.chamadasRpc.find((c) => c.nome === "criar_lead_financiamento");
    expect((chamada!.params as Record<string, unknown>).p_utm).toEqual({});
  });
});
