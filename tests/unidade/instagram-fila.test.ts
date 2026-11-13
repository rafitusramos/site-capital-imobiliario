import { describe, expect, it } from "vitest";
import { ehTemporario, motivoLegivel, proximaTentativa } from "@/lib/instagram/fila";

const T = new Date("2026-11-12T12:00:00Z");

describe("proximaTentativa", () => {
  it("recua exponencialmente e para na 3ª", () => {
    expect(proximaTentativa(0, T)).toEqual(new Date(+T + 60_000));
    expect(proximaTentativa(1, T)).toEqual(new Date(+T + 120_000));
    expect(proximaTentativa(2, T)).toEqual(new Date(+T + 240_000));
    expect(proximaTentativa(3, T)).toBeNull();
  });
});

describe("ehTemporario", () => {
  it("classifica", () => {
    expect(ehTemporario({ status: 400, codigo: 10, mensagem: "" })).toBe(false);
    expect(ehTemporario({ status: 429, mensagem: "" })).toBe(true);
    expect(ehTemporario({ status: 503, mensagem: "" })).toBe(true);
    expect(ehTemporario({ status: 400, codigo: 4, mensagem: "" })).toBe(true);
    expect(ehTemporario({ status: 400, codigo: 613, mensagem: "" })).toBe(true);
    expect(ehTemporario({ status: 400, codigo: 100, mensagem: "" })).toBe(false);
  });
});

describe("motivoLegivel", () => {
  it("janela fechada", () => {
    expect(motivoLegivel({ status: 400, codigo: 10, mensagem: "" })).toBe("Janela de 24 h fechada");
    expect(motivoLegivel({ status: 400, codigo: 100, subcodigo: 2018278, mensagem: "" })).toBe("Janela de 24 h fechada");
    expect(motivoLegivel({ status: 400, mensagem: "Message sent outside of allowed window" })).toBe("Janela de 24 h fechada");
  });
  it("não aceita mensagens", () => {
    expect(motivoLegivel({ status: 400, codigo: 551, mensagem: "" })).toBe("A pessoa não aceita mensagens");
  });
  it("fallback", () => {
    expect(motivoLegivel({ status: 400, codigo: 100, mensagem: "x" })).toBe("A Meta recusou o envio (código 100)");
    expect(motivoLegivel({ status: 500, mensagem: "x" })).toBe("A Meta recusou o envio (código 500)");
  });
});
