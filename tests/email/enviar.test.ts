import { afterEach, describe, expect, test, vi } from "vitest";
import { criarEmailer, type ClienteResend } from "@/lib/email/enviar";

function clienteFalso(sobrescrever: Partial<ClienteResend["emails"]> = {}) {
  const send = vi.fn(async () => ({ data: { id: "re_1" }, error: null }));
  const cancel = vi.fn(async () => ({ data: { id: "re_1" }, error: null }));
  const cliente: ClienteResend = { emails: { send, cancel, ...sobrescrever } };
  return { cliente, send, cancel };
}

const EMAIL = { para: "a@b.com", assunto: "Oi", html: "<p>oi</p>", texto: "oi" };

afterEach(() => vi.restoreAllMocks());

describe("enviar", () => {
  test("sem chave é no-op: devolve sem-chave e loga uma única vez", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { cliente, send } = clienteFalso();
    const emailer = criarEmailer({ chave: undefined, remetente: "RT <c@x.com>", cliente });

    expect(await emailer.enviar(EMAIL)).toEqual({ enviado: false, motivo: "sem-chave" });
    expect(await emailer.enviar(EMAIL)).toEqual({ enviado: false, motivo: "sem-chave" });
    expect(send).not.toHaveBeenCalled();
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  test("com chave envia com remetente, corpo html e texto", async () => {
    const { cliente, send } = clienteFalso();
    const emailer = criarEmailer({ chave: "k", remetente: "RT <c@x.com>", cliente });

    const r = await emailer.enviar({ ...EMAIL, replyTo: "r@x.com" });

    expect(r).toEqual({ enviado: true, id: "re_1" });
    expect(send).toHaveBeenCalledWith({
      from: "RT <c@x.com>",
      to: "a@b.com",
      subject: "Oi",
      html: "<p>oi</p>",
      text: "oi",
      replyTo: "r@x.com",
    });
  });

  test("agendarPara vira scheduledAt em ISO", async () => {
    const { cliente, send } = clienteFalso();
    const emailer = criarEmailer({ chave: "k", remetente: "r", cliente });
    const quando = new Date("2026-01-01T12:10:00.000Z");

    await emailer.enviar({ ...EMAIL, agendarPara: quando });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ scheduledAt: "2026-01-01T12:10:00.000Z" }));
  });

  test("erro devolvido pela API vira falha, sem lançar, e é logado", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente } = clienteFalso({ send: vi.fn(async () => ({ data: null, error: { message: "domínio não verificado" } })) });
    const emailer = criarEmailer({ chave: "k", remetente: "r", cliente });

    expect(await emailer.enviar(EMAIL)).toEqual({ enviado: false, motivo: "falha", erro: "domínio não verificado" });
    expect(log).toHaveBeenCalled();
  });

  test("exceção do cliente vira falha, sem lançar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente } = clienteFalso({ send: vi.fn(async () => { throw new Error("rede caiu"); }) });
    const emailer = criarEmailer({ chave: "k", remetente: "r", cliente });

    expect(await emailer.enviar(EMAIL)).toEqual({ enviado: false, motivo: "falha", erro: "rede caiu" });
  });
});

describe("cancelar", () => {
  test("chama a API de cancelamento", async () => {
    const { cliente, cancel } = clienteFalso();
    const emailer = criarEmailer({ chave: "k", remetente: "r", cliente });

    expect(await emailer.cancelar("re_9")).toEqual({ cancelado: true });
    expect(cancel).toHaveBeenCalledWith("re_9");
  });

  test("sem chave não faz nada", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { cliente, cancel } = clienteFalso();
    const emailer = criarEmailer({ chave: undefined, remetente: "r", cliente });

    expect(await emailer.cancelar("re_9")).toEqual({ cancelado: false, erro: "sem-chave" });
    expect(cancel).not.toHaveBeenCalled();
  });

  test("falha da API não lança", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente } = clienteFalso({ cancel: vi.fn(async () => ({ data: null, error: { message: "já enviado" } })) });
    const emailer = criarEmailer({ chave: "k", remetente: "r", cliente });

    expect(await emailer.cancelar("re_9")).toEqual({ cancelado: false, erro: "já enviado" });
  });

  test("anexo vai como attachments (Buffer) e nunca é agendado", async () => {
    const { cliente, send } = clienteFalso();
    const emailer = criarEmailer({ chave: "k", remetente: "r", cliente });
    const pdf = new Uint8Array([37, 80, 68, 70]);

    await emailer.enviar({
      ...EMAIL,
      agendarPara: new Date("2026-01-01T12:10:00.000Z"),
      anexos: [{ nome: "Simulacao-RT-RT-1.pdf", conteudo: pdf }],
    });

    const payload = (send.mock.calls as unknown as [{ attachments?: { filename: string; content: Buffer }[]; scheduledAt?: string }][])[0][0];
    expect(payload.scheduledAt).toBeUndefined();
    expect(payload.attachments).toHaveLength(1);
    expect(payload.attachments![0].filename).toBe("Simulacao-RT-RT-1.pdf");
    expect(Buffer.isBuffer(payload.attachments![0].content)).toBe(true);
    expect([...payload.attachments![0].content]).toEqual([37, 80, 68, 70]);
  });

  test("sem anexo o payload não leva attachments", async () => {
    const { cliente, send } = clienteFalso();
    await criarEmailer({ chave: "k", remetente: "r", cliente }).enviar(EMAIL);
    expect((send.mock.calls as unknown as unknown[][])[0][0]).not.toHaveProperty("attachments");
  });
});
