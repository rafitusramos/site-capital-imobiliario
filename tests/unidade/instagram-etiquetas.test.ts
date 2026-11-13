import { describe, expect, it } from "vitest";
import { dataCurta, etiquetaDaSituacao } from "@/lib/instagram/etiquetas";

const base = { situacao: "link_enviado" as const, comentarios: 1, falhaMotivo: null, lembreteEm: null };

describe("etiquetaDaSituacao", () => {
  it("falha vence tudo", () => {
    expect(
      etiquetaDaSituacao({ ...base, situacao: "link_aberto", comentarios: 5, falhaMotivo: "janela de 24h expirada" }),
    ).toEqual({ texto: "falha: janela de 24h expirada", tom: "erro" });
  });

  it("3 ou mais comentários vence a situação", () => {
    expect(etiquetaDaSituacao({ ...base, situacao: "aguardando_botao", comentarios: 3 })).toEqual({
      texto: "comentou 3+ vezes",
      tom: "andamento",
    });
  });

  it("2 comentários não dispara a regra de 3+", () => {
    expect(etiquetaDaSituacao({ ...base, situacao: "aguardando_botao", comentarios: 2 }).texto).toBe(
      "esperando o toque no botão",
    );
  });

  it("aguardando_botao", () => {
    expect(etiquetaDaSituacao({ ...base, situacao: "aguardando_botao" })).toEqual({
      texto: "esperando o toque no botão",
      tom: "andamento",
    });
  });

  it("aguardando_seguir", () => {
    expect(etiquetaDaSituacao({ ...base, situacao: "aguardando_seguir" })).toEqual({
      texto: "não segue ainda",
      tom: "neutro",
    });
  });

  it("link_enviado sem lembrete", () => {
    expect(etiquetaDaSituacao(base)).toEqual({ texto: "recebeu o link, não abriu", tom: "andamento" });
  });

  it("link_enviado com lembrete mostra a hora em São Paulo", () => {
    // 19:00Z = 16:00 em São Paulo (UTC-3)
    expect(etiquetaDaSituacao({ ...base, lembreteEm: "2026-11-13T19:00:00Z" }).texto).toBe(
      "recebeu o link, não abriu · lembrete às 16:00",
    );
    // meia-noite UTC = 21:00 do dia anterior em São Paulo
    expect(etiquetaDaSituacao({ ...base, lembreteEm: "2026-11-13T00:05:00+00:00" }).texto).toContain("às 21:05");
  });

  it("link_aberto", () => {
    expect(etiquetaDaSituacao({ ...base, situacao: "link_aberto" })).toEqual({
      texto: "abriu o link",
      tom: "sucesso",
    });
  });
});

describe("dataCurta", () => {
  it("formata dd/MM HH:mm em São Paulo", () => {
    expect(dataCurta("2026-11-13T17:32:00Z")).toBe("13/11 14:32");
    expect(dataCurta("2026-11-13T02:10:00+00:00")).toBe("12/11 23:10");
  });
});
