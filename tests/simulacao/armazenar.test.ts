import { describe, expect, test, vi } from "vitest";
import {
  BUCKET_SIMULACOES,
  caminhosDasSimulacoes,
  dadosSemLogos,
  gravarPdfSimulacao,
  removerArquivosSimulacao,
} from "@/lib/simulacao/armazenar";

const LEAD = "11111111-1111-4111-8111-111111111111";

describe("dadosSemLogos", () => {
  test("tira o logo de cada banco e não altera a entrada", () => {
    const entrada = { bancos: [{ nome: "A", logo: "data:image/png;base64,AAAA" }], x: 1 };
    const saida = dadosSemLogos(entrada) as { bancos: { logo?: unknown; nome: string }[]; x: number };
    expect(saida.bancos[0]).toEqual({ nome: "A" });
    expect(saida.x).toBe(1);
    expect(entrada.bancos[0].logo).toBe("data:image/png;base64,AAAA");
  });
});

describe("gravarPdfSimulacao", () => {
  test("grava em <lead>/<uuid>.pdf no bucket privado, application/pdf, sem upsert", async () => {
    const upload = vi.fn(async () => ({ data: {}, error: null }));
    const from = vi.fn(() => ({ upload }));
    const r = await gravarPdfSimulacao({ storage: { from } } as never, LEAD, Buffer.from("%PDF"));
    expect(from).toHaveBeenCalledWith(BUCKET_SIMULACOES);
    expect(r.caminho).toMatch(new RegExp(`^${LEAD}/[0-9a-f-]{36}\\.pdf$`));
    expect(upload).toHaveBeenCalledWith(r.caminho, expect.anything(), { contentType: "application/pdf", upsert: false });
  });
  test("erro do storage vira { erro } e é logado, sem lançar", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const upload = vi.fn(async () => ({ data: null, error: { message: "Bucket not found" } }));
    const r = await gravarPdfSimulacao({ storage: { from: () => ({ upload }) } } as never, LEAD, Buffer.from("x"));
    expect(r).toEqual({ erro: "Bucket not found" });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("caminhosDasSimulacoes", () => {
  function admin(resposta: { data: unknown; error: unknown } | "lanca") {
    return {
      from: () => ({
        select: () => ({
          eq: async () => {
            if (resposta === "lanca") throw new Error("boom");
            return resposta;
          },
        }),
      }),
    } as never;
  }
  test("lista os caminhos do lead", async () => {
    expect(await caminhosDasSimulacoes(admin({ data: [{ storage_path: "a/1.pdf" }, { storage_path: "a/2.pdf" }], error: null }), LEAD)).toEqual([
      "a/1.pdf",
      "a/2.pdf",
    ]);
  });
  test("tabela inexistente (migration pendente) ou exceção devolve lista vazia, com console.error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await caminhosDasSimulacoes(admin({ data: null, error: { message: "relation does not exist" } }), LEAD)).toEqual([]);
    expect(await caminhosDasSimulacoes(admin("lanca"), LEAD)).toEqual([]);
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});

describe("removerArquivosSimulacao", () => {
  test("sem caminhos não toca no storage", async () => {
    const from = vi.fn();
    await removerArquivosSimulacao({ storage: { from } } as never, []);
    expect(from).not.toHaveBeenCalled();
  });
  test("remove no bucket; falha vira console.error e não lança", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const remove = vi.fn(async () => ({ data: null, error: { message: "falhou" } }));
    await expect(removerArquivosSimulacao({ storage: { from: () => ({ remove }) } } as never, ["a/1.pdf"])).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(["a/1.pdf"]);
    expect(log).toHaveBeenCalled();
    const lanca = { storage: { from: () => ({ remove: async () => { throw new Error("rede"); } }) } } as never;
    await expect(removerArquivosSimulacao(lanca, ["a/1.pdf"])).resolves.toBeUndefined();
    log.mockRestore();
  });
});
