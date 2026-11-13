import { describe, expect, it } from "vitest";
import { corpoMensagem, lerPayload, payloadBotao } from "@/lib/instagram/mensagens";

const ID = "123e4567-e89b-42d3-a456-426614174000";

describe("payload do botão", () => {
  it("ida e volta", () => {
    expect(lerPayload(payloadBotao("b1", ID))).toEqual({ acao: "b1", participacaoId: ID });
    expect(lerPayload(payloadBotao("seguir", ID))).toEqual({ acao: "seguir", participacaoId: ID });
  });
  it("rejeita o que não é nosso", () => {
    expect(lerPayload("ig:b1:nao-uuid")).toBeNull();
    expect(lerPayload("MANYCHAT_XYZ")).toBeNull();
    expect(lerPayload(`ig:outra:${ID}`)).toBeNull();
  });
});

describe("corpoMensagem", () => {
  it("botão postback", () => {
    expect(corpoMensagem({ texto: "Oi", botao: { tipo: "postback", titulo: "Quero", payload: "p" } })).toEqual({
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Oi",
          buttons: [{ type: "postback", title: "Quero", payload: "p" }],
        },
      },
    });
  });
  it("botão de link vira web_url", () => {
    expect(corpoMensagem({ texto: "Oi", botao: { tipo: "link", titulo: "Abrir", url: "https://x.com/" } })).toEqual({
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Oi",
          buttons: [{ type: "web_url", url: "https://x.com/", title: "Abrir" }],
        },
      },
    });
  });
});
