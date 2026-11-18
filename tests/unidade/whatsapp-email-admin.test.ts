import { describe, expect, it } from "vitest";
import { whatsappAdmin } from "@/lib/email/templates/whatsapp-admin";

describe("whatsappAdmin", () => {
  it("assunto com o nome", () => {
    const e = whatsappAdmin({ nome: "Maria", telefone: "19999991234", protocolo: "RT-1", texto: "oi" });
    expect(e.assunto).toBe("WhatsApp: Maria respondeu");
    expect(e.texto).toContain("RT-1");
    expect(e.texto).toContain("oi");
  });

  it("escapa HTML de nome e texto", () => {
    const e = whatsappAdmin({
      nome: "<b>Eu</b>",
      telefone: "1",
      protocolo: null,
      texto: "<script>alert(1)</script>",
    });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).not.toContain("<b>Eu</b>");
  });

  it("sem protocolo não mostra a linha", () => {
    const e = whatsappAdmin({ nome: "Ana", telefone: "1", protocolo: null, texto: "x" });
    expect(e.texto).not.toContain("Protocolo");
  });
});
