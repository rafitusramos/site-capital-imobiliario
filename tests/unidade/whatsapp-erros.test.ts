import { describe, expect, it } from "vitest";
import { ehTemporarioWa, motivoLegivelWa } from "@/lib/whatsapp/erros";

const e = (codigo?: number, status = 400) => ({ status, codigo, mensagem: "" });

describe("erros do WhatsApp", () => {
  it("códigos temporários próprios", () => {
    for (const c of [131056, 130429, 131048, 131000]) expect(ehTemporarioWa(e(c))).toBe(true);
  });
  it("herda os temporários do Instagram", () => {
    expect(ehTemporarioWa(e(undefined, 503))).toBe(true);
    expect(ehTemporarioWa(e(4))).toBe(true);
  });
  it("erro definitivo não é temporário", () => {
    expect(ehTemporarioWa(e(131047))).toBe(false);
  });
  it("motivos legíveis", () => {
    expect(motivoLegivelWa(e(131047))).toBe("Janela de 24 h fechada");
    expect(motivoLegivelWa(e(131026))).toBe("Número não recebe WhatsApp");
    expect(motivoLegivelWa(e(132001))).toBe("Problema no template (código 132001)");
    expect(motivoLegivelWa(e(999))).toBe("A Meta recusou o envio (código 999)");
  });
});
