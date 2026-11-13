import { describe, expect, it } from "vitest";
import { lerEventoGravado, lerEventos } from "@/lib/instagram/eventos";
import {
  IG_CONTA,
  IG_PESSOA,
  fixtureComentario,
  fixtureEco,
  fixtureLeitura,
  fixtureMensagem,
  fixturePostback,
} from "../apoio/instagram-webhooks";

describe("lerEventos", () => {
  it("comentário vira evento comentario", () => {
    expect(lerEventos(fixtureComentario())).toEqual([
      {
        tipo: "comentario",
        chave: "18000000000000001",
        comentarioId: "18000000000000001",
        midiaId: "17900000000000001",
        deId: IG_PESSOA,
        deUsername: "maria.silva",
        texto: "quero saber mais",
      },
    ]);
  });
  it("resposta a comentário (parent_id) continua comentario", () => {
    const e = lerEventos(fixtureComentario({ parent_id: "18000000000000000" }));
    expect(e).toHaveLength(1);
    expect(e[0].tipo).toBe("comentario");
  });
  it("comentário sem username vira deUsername null", () => {
    const c = fixtureComentario({ from: { id: IG_PESSOA } });
    expect(lerEventos(c)[0]).toMatchObject({ deUsername: null });
  });
  it("postback vira botao", () => {
    expect(lerEventos(fixturePostback())).toEqual([
      { tipo: "botao", chave: "mid.botao1", deId: IG_PESSOA, payload: "ig:abc123", titulo: "Quero o link" },
    ]);
  });
  it("mensagem vira texto com eco false", () => {
    expect(lerEventos(fixtureMensagem())).toEqual([
      { tipo: "texto", chave: "mid.texto1", deId: IG_PESSOA, paraId: IG_CONTA, texto: "oi", eco: false, mid: "mid.texto1" },
    ]);
  });
  it("eco marca eco true e paraId é o destinatário", () => {
    expect(lerEventos(fixtureEco())).toMatchObject([{ tipo: "texto", eco: true, deId: IG_CONTA, paraId: IG_PESSOA }]);
  });
  it("anexo sem texto vira texto null", () => {
    const e = lerEventos(fixtureMensagem({ mid: "mid.a", attachments: [{ type: "image" }] }));
    expect(e).toMatchObject([{ tipo: "texto", texto: null }]);
  });
  it("leitura e reação não geram evento", () => {
    expect(lerEventos(fixtureLeitura())).toEqual([]);
  });
  it("object diferente, null e lixo viram []", () => {
    expect(lerEventos({ object: "page", entry: [] })).toEqual([]);
    expect(lerEventos(null)).toEqual([]);
    expect(lerEventos("x")).toEqual([]);
    expect(lerEventos({ object: "instagram", entry: "x" })).toEqual([]);
    expect(lerEventos({ object: "instagram", entry: [null, { changes: [{ field: "comments", value: {} }] }] })).toEqual([]);
  });
  it("field que não é comments é ignorado", () => {
    const c = fixtureComentario();
    c.entry[0].changes[0].field = "mentions";
    expect(lerEventos(c)).toEqual([]);
  });
  it("lote com 2 entries gera 2 eventos", () => {
    const a = fixtureComentario();
    const b = fixtureMensagem();
    expect(lerEventos({ object: "instagram", entry: [...a.entry, ...b.entry] })).toHaveLength(2);
  });
});

describe("lerEventoGravado", () => {
  it("devolve o evento quando o payload gravado tem a forma certa", () => {
    const e = { tipo: "botao" as const, chave: "m1", deId: "p1", payload: "ig:b1:x", titulo: "Oi" };
    expect(lerEventoGravado(e)).toEqual(e);
  });
  it("null para forma inválida, tipo desconhecido ou valor não objeto", () => {
    expect(lerEventoGravado({ tipo: "comentario", chave: "c" })).toBeNull();
    expect(lerEventoGravado({ tipo: "outro" })).toBeNull();
    expect(lerEventoGravado(null)).toBeNull();
    expect(lerEventoGravado("x")).toBeNull();
  });
});
