import { describe, expect, it } from "vitest";
import { lerEventosWa, statusAvanca, type StatusWa } from "@/lib/whatsapp/eventos";
import {
  fixtureAudio,
  fixtureBotaoInterativo,
  fixtureBotaoTemplate,
  fixtureStatus,
  fixtureTexto,
  fixtureWa,
  mensagemTexto,
  statusItem,
  WA_PESSOA,
} from "../apoio/whatsapp-webhooks";

describe("lerEventosWa", () => {
  it("texto simples gera 1 evento de mensagem", () => {
    const eventos = lerEventosWa(fixtureTexto("wamid.X"));
    expect(eventos).toEqual([
      {
        tipo: "mensagem",
        chave: "m:wamid.X",
        waId: WA_PESSOA,
        nomePerfil: "Maria Silva",
        metaId: "wamid.X",
        conteudo: "texto",
        texto: "oi, quero saber mais",
        em: new Date(1760000000 * 1000).toISOString(),
      },
    ]);
  });

  it("ignora corpo de outro objeto", () => {
    expect(lerEventosWa({ ...fixtureTexto(), object: "instagram" })).toEqual([]);
  });

  it("status failed carrega o código de erro", () => {
    const eventos = lerEventosWa(
      fixtureStatus("failed", { errors: [{ code: 131047, title: "Re-engagement", message: "Fora da janela" }] }),
    );
    expect(eventos).toEqual([
      {
        tipo: "status",
        chave: "s:wamid.S1:failed",
        metaId: "wamid.S1",
        status: "falhou",
        erro: { codigo: 131047, mensagem: "Fora da janela" },
      },
    ]);
  });

  it("traduz sent, delivered e read", () => {
    const status = (s: string) => {
      const [e] = lerEventosWa(fixtureStatus(s));
      return e.tipo === "status" ? [e.status, e.erro] : null;
    };
    expect(status("sent")).toEqual(["enviado", null]);
    expect(status("delivered")).toEqual(["entregue", null]);
    expect(status("read")).toEqual(["lido", null]);
  });

  it("status desconhecido é ignorado", () => {
    expect(lerEventosWa(fixtureStatus("deleted"))).toEqual([]);
  });

  it("áudio vira conteudo outro sem texto", () => {
    const [e] = lerEventosWa(fixtureAudio());
    expect(e).toMatchObject({ tipo: "mensagem", conteudo: "outro", texto: null, metaId: "wamid.audio1" });
  });

  it("botão de template vira conteudo botao com o título", () => {
    const [e] = lerEventosWa(fixtureBotaoTemplate());
    expect(e).toMatchObject({ tipo: "mensagem", conteudo: "botao", texto: "Quero atendimento" });
  });

  it("resposta de botão interativo vira conteudo botao", () => {
    const [e] = lerEventosWa(fixtureBotaoInterativo());
    expect(e).toMatchObject({ tipo: "mensagem", conteudo: "botao", texto: "Financiamento" });
  });

  it("lote com 2 mensagens e 1 status gera 3 eventos", () => {
    const corpo = fixtureWa({
      messages: [mensagemTexto("wamid.A", "um"), mensagemTexto("wamid.B", "dois")],
      statuses: [statusItem("read")],
    });
    const eventos = lerEventosWa(corpo);
    expect(eventos).toHaveLength(3);
    expect(eventos.map((e) => e.chave)).toEqual(["m:wamid.A", "m:wamid.B", "s:wamid.S1:read"]);
  });

  it("nome de perfil nulo quando o contato não casa", () => {
    const [e] = lerEventosWa(fixtureWa({ messages: [mensagemTexto()], contacts: [] }));
    expect(e).toMatchObject({ tipo: "mensagem", nomePerfil: null });
  });

  it("ignora changes de outro field", () => {
    const corpo = fixtureTexto();
    (corpo.entry[0].changes[0] as { field: string }).field = "account_update";
    expect(lerEventosWa(corpo)).toEqual([]);
  });

  it("ignora item inválido e mantém os válidos", () => {
    const corpo = fixtureWa({ messages: [{ lixo: true }, mensagemTexto("wamid.OK")] });
    expect(lerEventosWa(corpo).map((e) => e.chave)).toEqual(["m:wamid.OK"]);
  });

  it("lixo nunca lança e devolve vazio", () => {
    expect(lerEventosWa(null)).toEqual([]);
    expect(lerEventosWa("x")).toEqual([]);
    expect(lerEventosWa({ entry: 3 })).toEqual([]);
    expect(lerEventosWa({ object: "whatsapp_business_account", entry: 3 })).toEqual([]);
    expect(lerEventosWa({ object: "whatsapp_business_account", entry: [null, { changes: 1 }] })).toEqual([]);
  });
});

describe("statusAvanca", () => {
  it("null sempre avança", () => {
    for (const s of ["enviado", "entregue", "lido", "falhou"] as StatusWa[]) {
      expect(statusAvanca(null, s)).toBe(true);
    }
  });

  it("avança na ordem enviado < entregue < lido", () => {
    expect(statusAvanca("enviado", "entregue")).toBe(true);
    expect(statusAvanca("enviado", "lido")).toBe(true);
    expect(statusAvanca("entregue", "lido")).toBe(true);
  });

  it("não avança para o mesmo status nem retrocede", () => {
    expect(statusAvanca("lido", "lido")).toBe(false);
    expect(statusAvanca("entregue", "entregue")).toBe(false);
    expect(statusAvanca("lido", "entregue")).toBe(false);
    expect(statusAvanca("lido", "enviado")).toBe(false);
    expect(statusAvanca("entregue", "enviado")).toBe(false);
  });

  it("falhou sempre avança", () => {
    expect(statusAvanca("enviado", "falhou")).toBe(true);
    expect(statusAvanca("lido", "falhou")).toBe(true);
    expect(statusAvanca("falhou", "falhou")).toBe(true);
    expect(statusAvanca(null, "falhou")).toBe(true);
  });
});
