import { describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";
import type { Emailer } from "@/lib/email/enviar";
import { executarSimulacao, type DepsSimulacao } from "@/lib/simulacao/servico";
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

function montar(opcoes: { upload?: { error: { message: string } | null }; insertErro?: boolean; semChave?: boolean } = {}) {
  const falso = criarSupabaseFalso();
  const upload = vi.fn(async () => ({ data: {}, error: opcoes.upload?.error ?? null }));
  const admin = { ...falso.cliente, storage: { from: () => ({ upload }) } } as never;
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
  return { falso, upload, enviar, gerarPdf, deps };
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

  test("enviar: grava o PDF, envia ao e-mail DO BANCO com anexo, registra o histórico sem logos", async () => {
    const { falso, upload, enviar, deps } = montar();
    const r = await executarSimulacao(deps, "enviar", LEAD, DADOS, "user-1");

    expect(upload).toHaveBeenCalledTimes(1);
    expect(enviar).toHaveBeenCalledTimes(1);
    const email = enviar.mock.calls[0][0] as { para: string; anexos: { nome: string }[] };
    expect(email.para).toBe("maria@example.com");
    expect(email.anexos[0].nome).toBe("Simulacao-RT-RT-2026-0042.pdf");
    expect(r).toMatchObject({ acao: "enviar", emailStatus: "enviado", registrado: true, simulacaoId: "sim-1" });

    const linha = falso.chamadas.find((c) => c.tabela === "crm_simulacoes" && c.operacao === "insert")!.payload as Record<string, unknown>;
    expect(linha).toMatchObject({ lead_id: LEAD.id, criado_por: "user-1", email_status: "enviado", resend_id: "re_maria@example.com" });
    expect(String(linha.storage_path)).toMatch(new RegExp(`^${LEAD.id}/.+\\.pdf$`));
    expect(JSON.stringify(linha.dados)).not.toContain("data:image");
  });

  test("falha ao gravar no bucket não impede o e-mail, mas avisa que não ficou registrado", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { falso, enviar, deps } = montar({ upload: { error: { message: "Bucket not found" } } });
    const r = await executarSimulacao(deps, "enviar", LEAD, DADOS, "user-1");
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ emailStatus: "enviado", registrado: false });
    expect(falso.chamadas.some((c) => c.tabela === "crm_simulacoes")).toBe(false);
    log.mockRestore();
  });

  test("tabela ausente (migration pendente): e-mail segue, registrado=false, console.error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { enviar, deps } = montar({ insertErro: true });
    const r = await executarSimulacao(deps, "enviar", LEAD, DADOS, "user-1");
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ emailStatus: "enviado", registrado: false });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  test("sem chave do Resend o status é sem-chave", async () => {
    const { deps } = montar({ semChave: true });
    expect(await executarSimulacao(deps, "enviar", LEAD, DADOS, "user-1")).toMatchObject({ emailStatus: "sem-chave" });
  });

  test("lead que não é financiamento é recusado antes de gerar qualquer coisa", async () => {
    const { gerarPdf, deps } = montar();
    await expect(executarSimulacao(deps, "previa", { ...LEAD, tipo: "home-equity" }, DADOS, "u")).rejects.toThrow(/financiamento/i);
    expect(gerarPdf).not.toHaveBeenCalled();
  });
});
