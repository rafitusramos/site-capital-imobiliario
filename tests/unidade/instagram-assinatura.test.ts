import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaValida } from "@/lib/instagram/assinatura";

const SEGREDO = "segredo-do-app";
const corpo = '{"object":"instagram","entry":[]}';
const assinar = (c: string, s = SEGREDO) => "sha256=" + createHmac("sha256", s).update(c).digest("hex");

describe("assinaturaValida", () => {
  it("aceita assinatura correta", () => {
    expect(assinaturaValida(corpo, assinar(corpo), SEGREDO)).toBe(true);
  });
  it("recusa corpo alterado", () => {
    expect(assinaturaValida(corpo + " ", assinar(corpo), SEGREDO)).toBe(false);
  });
  it("recusa segredo errado", () => {
    expect(assinaturaValida(corpo, assinar(corpo, "outro"), SEGREDO)).toBe(false);
  });
  it("recusa cabeçalho ausente, sem prefixo ou de tamanho errado", () => {
    expect(assinaturaValida(corpo, null, SEGREDO)).toBe(false);
    expect(assinaturaValida(corpo, assinar(corpo).slice(7), SEGREDO)).toBe(false);
    expect(assinaturaValida(corpo, "sha256=abc", SEGREDO)).toBe(false);
    expect(assinaturaValida(corpo, "sha256=", SEGREDO)).toBe(false);
  });
  it("recusa segredo vazio", () => {
    expect(assinaturaValida(corpo, assinar(corpo, ""), "")).toBe(false);
  });
});
