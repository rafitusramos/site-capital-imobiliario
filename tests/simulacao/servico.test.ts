import { describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";
import type { Emailer } from "@/lib/email/enviar";
import { ErroSimulacao, enviarSimulacaoAnexada, executarSimulacao, obterPdfAnexado, type DepsSimulacao } from "@/lib/simulacao/servico";
import type { DadosCreditas, SimulacaoView } from "@/lib/simulacao/tipos";

const LEAD = {
  id: "11111111-1111-4111-8111-111111111111",
  tipo: "financiamento" as const,
  nome: "Maria <b>Teste</b>",
  email: "maria@example.com",
  telefone: "(19) 90000-0000",
  protocolo: "RT-2026-0042",
};
const DADOS: DadosCreditas = {
  data: "",
  valor_imovel: 400000,
  valor_financiamento: 260000,
  renda_media: null,
  meses: [1, 12],
  bancos: [
    { nome: "Banco Alfa", taxa: 12, cet: 13, custo_total: 800000, prazo: 420, indexador: "TR", sistema: "SAC", primeira: 3000, ultima: 650, parcelas: [3000, 2900], logo: "data:image/png;base64,AAAA" },
  ],
};
const AGORA = new Date("2026-03-01T12:00:00.000Z");
const PDF = Buffer.from("%PDF-ficticio");

function montar(
  opcoes: { upload?: { error: { message: string } | null }; insertErro?: boolean; semChave?: boolean; downloadErro?: boolean } = {},
) {
  const falso = criarSupabaseFalso();
  const upload = vi.fn(async () => ({ data: {}, error: opcoes.upload?.error ?? null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const download = vi.fn(async () =>
    opcoes.downloadErro ? { data: null, error: { message: "Object not found" } } : { data: new Blob([PDF]), error: null },
  );
  const admin = { ...falso.cliente, storage: { from: () => ({ upload, remove, download }) } } as never;
  const enviar = vi.fn(async (e: { para: string }) =>
    opcoes.semChave ? ({ enviado: false, motivo: "sem-chave" } as const) : ({ enviado: true, id: `re_${e.para}` } as const),
  );
  const emailer = { enviar, cancelar: vi.fn(async () => ({ cancelado: true })) } as unknown as Emailer;
  const gerarPdf = vi.fn(async (vm: SimulacaoView) => { void vm; return PDF; });
  falso.programarResposta("crm_simulacoes", "insert", opcoes.insertErro ? { data: null, error: { message: "relation does not exist" } } : { data: { id: "sim-1" }, error: null });
  const deps: DepsSimulacao = {
    gerarPdf,
    admin: () => admin,
    email: () => ({ admin: falso.cliente as never, emailer, emailAdmin: "dono@rt.com", agora: () => AGORA }),
    agora: () => AGORA,
  };
  return { falso, upload, remove, download, enviar, gerarPdf, deps };
}

describe("executarSimulacao", () => {
  test("prévia gera o PDF com nome e protocolo do BANCO e não grava nem envia nada", async () => {
    const { falso, upload, enviar, gerarPdf, deps } = montar();
    const r = await executarSimulacao(deps, "previa", LEAD, DADOS, "user-1");
    expect(r).toEqual({ acao: "previa", pdf: PDF, nomeArquivo: "Simulacao-RT-RT-2026-0042.pdf" });
    const vm = gerarPdf.mock.calls[0][0] as { saudacao: string; referencia: string; data: string };
    expect(vm.saudacao).toContain("Maria <b>Teste</b>"); // o escape é do html.ts; aqui só se confirma a origem
    expect(vm.referencia).toBe("RT-2026-0042");
    expect(upload).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
    expect(falso.chamadas.filter((c) => c.operacao === "insert")).toEqual([]);
  });

  test("a prévia não cria cliente de serviço nem de e-mail (não exige a chave de serviço)", async () => {
    const { deps } = montar();
    const admin = vi.fn(deps.admin);
    const email = vi.fn(deps.email);
    await executarSimulacao({ ...deps, admin, email }, "previa", LEAD, DADOS, "user-1");
    expect(admin).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
  });

  test("sem data no PDF, usa a data de hoje em São Paulo", async () => {
    const { gerarPdf, deps } = montar();
    await executarSimulacao(deps, "previa", LEAD, DADOS, "user-1");
    expect((gerarPdf.mock.calls[0][0] as { data: string }).data).toBe("01/03/2026");
  });

  test("com data no PDF, mantém a do PDF", async () => {
    const { gerarPdf, deps } = montar();
    await executarSimulacao(deps, "previa", LEAD, { ...DADOS, data: "06/11/2026" }, "user-1");
    expect((gerarPdf.mock.calls[0][0] as { data: string }).data).toBe("06/11/2026");
  });

  test("lead que não é financiamento é recusado antes de gerar qualquer coisa", async () => {
    const { gerarPdf, deps } = montar();
    await expect(executarSimulacao(deps, "previa", { ...LEAD, tipo: "home-equity" }, DADOS, "u")).rejects.toThrow(/financiamento/i);
    expect(gerarPdf).not.toHaveBeenCalled();
  });
});


const SIM = "22222222-2222-4222-8222-222222222222";
const LINHA = { id: SIM, lead_id: LEAD.id, storage_path: `${LEAD.id}/x.pdf`, email_status: "anexado", enviado_em: null };

describe("executarSimulacao: anexar", () => {
  test("grava o PDF e a linha como 'anexado', sem logos, e NÃO envia e-mail", async () => {
    const { falso, upload, enviar, deps } = montar();
    const r = await executarSimulacao(deps, "anexar", LEAD, DADOS, "user-1");

    expect(upload).toHaveBeenCalledTimes(1);
    expect(enviar).not.toHaveBeenCalled();
    expect(falso.chamadas.some((c) => c.tabela === "crm_emails")).toBe(false);
    expect(r).toMatchObject({ acao: "anexar", simulacaoId: "sim-1", nomeArquivo: "Simulacao-RT-RT-2026-0042.pdf" });

    const linha = falso.chamadas.find((c) => c.tabela === "crm_simulacoes" && c.operacao === "insert")!.payload as Record<string, unknown>;
    expect(linha).toMatchObject({ lead_id: LEAD.id, criado_por: "user-1", email_status: "anexado" });
    expect(linha).not.toHaveProperty("resend_id");
    expect(String(linha.storage_path)).toMatch(new RegExp(`^${LEAD.id}/.+\\.pdf$`));
    expect(JSON.stringify(linha.dados)).not.toContain("data:image");
  });

  test("falha ao gravar no bucket: erro claro, nada registrado", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { falso, deps } = montar({ upload: { error: { message: "Bucket not found" } } });
    await expect(executarSimulacao(deps, "anexar", LEAD, DADOS, "user-1")).rejects.toBeInstanceOf(ErroSimulacao);
    expect(falso.chamadas.some((c) => c.tabela === "crm_simulacoes")).toBe(false);
    log.mockRestore();
  });

  test("migration 032 pendente (check recusa 'anexado'): console.error, PDF órfão removido e erro claro", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { remove, enviar, deps } = montar({ insertErro: true });
    const erro = await executarSimulacao(deps, "anexar", LEAD, DADOS, "user-1").catch((e) => e);
    expect(erro).toBeInstanceOf(ErroSimulacao);
    expect(erro.message).toMatch(/anexar/i);
    expect(log).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(enviar).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("enviarSimulacaoAnexada", () => {
  test("lê o PDF JÁ GRAVADO do bucket (sem regerar), envia ao e-mail DO BANCO e atualiza a linha", async () => {
    const { falso, download, enviar, gerarPdf, deps } = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: LINHA, error: null });
    falso.programarResposta("crm_simulacoes", "update", { data: [{ id: SIM }], error: null });

    const r = await enviarSimulacaoAnexada(deps, LEAD, SIM);

    expect(download).toHaveBeenCalledWith(LINHA.storage_path);
    expect(gerarPdf).not.toHaveBeenCalled();
    expect(enviar).toHaveBeenCalledTimes(1);
    const email = enviar.mock.calls[0][0] as { para: string; anexos: { nome: string }[] };
    expect(email.para).toBe("maria@example.com");
    expect(email.anexos[0].nome).toBe("Simulacao-RT-RT-2026-0042.pdf");
    expect(r).toMatchObject({ emailStatus: "enviado", simulacaoId: SIM });

    const sel = falso.chamadas.find((c) => c.tabela === "crm_simulacoes" && c.operacao === "select")!;
    expect(sel.filtros).toEqual(expect.arrayContaining([{ metodo: "eq", args: ["lead_id", LEAD.id] }]));
    const updates = falso.chamadas.filter((c) => c.tabela === "crm_simulacoes" && c.operacao === "update");
    expect(updates[updates.length - 1].payload).toMatchObject({
      email_status: "enviado",
      resend_id: "re_maria@example.com",
      enviado_em: AGORA.toISOString(),
    });
  });

  test("simulação de outro lead (ou inexistente) é recusada sem enviar nada", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: null, error: null });
    const erro = await enviarSimulacaoAnexada(deps, LEAD, SIM).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroSimulacao);
    expect(erro.status).toBe(404);
    expect(enviar).not.toHaveBeenCalled();
  });

  test("já enviada: recusa (clique duplo não duplica o e-mail)", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: { ...LINHA, email_status: "enviado" }, error: null });
    const erro = await enviarSimulacaoAnexada(deps, LEAD, SIM).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroSimulacao);
    expect(erro.status).toBe(409);
    expect(enviar).not.toHaveBeenCalled();
  });

  test("envio concorrente: a trava não pegou nenhuma linha, então não envia", async () => {
    const { falso, enviar, deps } = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: LINHA, error: null });
    falso.programarResposta("crm_simulacoes", "update", { data: [], error: null });
    const erro = await enviarSimulacaoAnexada(deps, LEAD, SIM).catch((e) => e);
    expect(erro.status).toBe(409);
    expect(enviar).not.toHaveBeenCalled();
  });

  test("PDF ausente no bucket: libera a trava e devolve erro, sem e-mail", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { falso, enviar, deps } = montar({ downloadErro: true });
    falso.programarResposta("crm_simulacoes", "select", { data: LINHA, error: null });
    falso.programarResposta("crm_simulacoes", "update", { data: [{ id: SIM }], error: null });
    await expect(enviarSimulacaoAnexada(deps, LEAD, SIM)).rejects.toBeInstanceOf(ErroSimulacao);
    expect(enviar).not.toHaveBeenCalled();
    const updates = falso.chamadas.filter((c) => c.operacao === "update");
    expect(updates[updates.length - 1].payload).toMatchObject({ enviado_em: null });
    log.mockRestore();
  });

  test("sem chave do Resend: status sem-chave e enviado_em volta a nulo (dá para tentar de novo)", async () => {
    const { falso, deps } = montar({ semChave: true });
    falso.programarResposta("crm_simulacoes", "select", { data: LINHA, error: null });
    falso.programarResposta("crm_simulacoes", "update", { data: [{ id: SIM }], error: null });
    const r = await enviarSimulacaoAnexada(deps, LEAD, SIM);
    expect(r).toMatchObject({ emailStatus: "sem-chave" });
    const updates = falso.chamadas.filter((c) => c.operacao === "update");
    expect(updates[updates.length - 1].payload).toMatchObject({ email_status: "sem-chave", enviado_em: null });
  });

  test("lead que não é financiamento é recusado", async () => {
    const { deps } = montar();
    await expect(enviarSimulacaoAnexada(deps, { ...LEAD, tipo: "home-equity" }, SIM)).rejects.toThrow(/financiamento/i);
  });
});

describe("obterPdfAnexado", () => {
  test("devolve o PDF gravado da simulação daquele lead", async () => {
    const { falso, deps } = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: LINHA, error: null });
    const r = await obterPdfAnexado(deps, LEAD, SIM);
    expect(Buffer.from(r.pdf).toString()).toBe("%PDF-ficticio");
    expect(r.nomeArquivo).toBe("Simulacao-RT-RT-2026-0042.pdf");
  });
  test("simulação que não é do lead: 404", async () => {
    const { falso, deps } = montar();
    falso.programarResposta("crm_simulacoes", "select", { data: null, error: null });
    await expect(obterPdfAnexado(deps, LEAD, SIM)).rejects.toMatchObject({ status: 404 });
  });
});
