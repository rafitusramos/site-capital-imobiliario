import { describe, expect, it } from "vitest";
import {
  decidirAoComentar,
  decidirAoTocar,
  decidirLembrete,
  momentoDoLembrete,
} from "@/lib/instagram/fluxo";
import { payloadBotao } from "@/lib/instagram/mensagens";
import { TEXTOS_PADRAO } from "@/lib/instagram/textos-padrao";
import type { Automacao } from "@/lib/instagram/tipos";

const HORA = 3600_000;
const agora = new Date("2026-11-12T15:00:00.000Z");
const URL = "https://rtcapitalimobiliario.com.br/ir/abc/";

function auto(extra: Partial<Automacao> = {}): Automacao {
  return {
    id: "a1",
    nome: "Teste",
    slug: "teste",
    ativa: true,
    alvo: "qualquer",
    midiaId: null,
    proximaDesde: null,
    palavras: null,
    responderPublico: true,
    frasesPublicas: ["f0", "f1", "f2"],
    dm1Texto: "DM1",
    dm1Botao: "Me envie o link",
    exigirSeguir: false,
    seguirTexto: TEXTOS_PADRAO.seguirTexto,
    seguirBotao: TEXTOS_PADRAO.seguirBotao,
    seguirInsisteTexto: TEXTOS_PADRAO.seguirInsisteTexto,
    linkTexto: "LINK",
    linkBotao: "Abrir",
    linkUrl: "https://exemplo.com",
    lembreteAtivo: true,
    lembreteHoras: 2,
    lembreteTexto: TEXTOS_PADRAO.lembreteTexto,
    retomadaBotaoTexto: TEXTOS_PADRAO.retomadaBotaoTexto,
    retomadaSeguirTexto: TEXTOS_PADRAO.retomadaSeguirTexto,
    retomadaLinkTexto: TEXTOS_PADRAO.retomadaLinkTexto,
    criadoEm: "2026-11-01T00:00:00.000Z",
    ...extra,
  };
}

const ctxC = (extra: Partial<{ segue: boolean | null }> = {}) => ({
  comentarioId: "c1",
  segue: null as boolean | null,
  urlCurta: URL,
  sortear: () => 1,
  ...extra,
});
const part = (situacao: Parameters<typeof decidirAoComentar>[1]["situacao"], comentarios: number) => ({
  id: "p1",
  situacao,
  comentarios,
});
const ctxT = (segue: boolean | null) => ({
  segue,
  urlCurta: URL,
  agora,
  janelaAte: new Date(agora.getTime() + 24 * HORA),
});

describe("decidirAoComentar", () => {
  it("1º comentário: resposta pública sorteada + DM1 com botão b1", () => {
    expect(decidirAoComentar(auto(), part(null, 1), ctxC())).toEqual([
      { tipo: "resposta_publica", comentarioId: "c1", texto: "f1" },
      {
        tipo: "resposta_privada",
        comentarioId: "c1",
        mensagem: {
          texto: "DM1",
          botao: { tipo: "postback", titulo: "Me envie o link", payload: payloadBotao("b1", "p1") },
        },
        situacao: "aguardando_botao",
      },
    ]);
  });

  it("1º comentário sem responderPublico: só a resposta privada", () => {
    const r = decidirAoComentar(auto({ responderPublico: false }), part(null, 1), ctxC());
    expect(r.map((x) => x.tipo)).toEqual(["resposta_privada"]);
  });

  it("responderPublico com lista vazia: pula a resposta pública", () => {
    const r = decidirAoComentar(auto({ frasesPublicas: [] }), part(null, 1), ctxC());
    expect(r.map((x) => x.tipo)).toEqual(["resposta_privada"]);
  });

  it("2º comentário em aguardando_botao: pública + retomadaBotao + botão b1", () => {
    const r = decidirAoComentar(auto(), part("aguardando_botao", 2), ctxC());
    expect(r[0]).toMatchObject({ tipo: "resposta_publica", texto: "f1" });
    expect(r[1]).toMatchObject({
      tipo: "resposta_privada",
      mensagem: {
        texto: TEXTOS_PADRAO.retomadaBotaoTexto,
        botao: { tipo: "postback", payload: "ig:b1:p1" },
      },
    });
  });

  it("2º comentário em aguardando_seguir, segue false: retomadaSeguir + botão seguir", () => {
    const r = decidirAoComentar(auto(), part("aguardando_seguir", 2), ctxC({ segue: false }));
    expect(r[1]).toMatchObject({
      tipo: "resposta_privada",
      mensagem: {
        texto: TEXTOS_PADRAO.retomadaSeguirTexto,
        botao: { tipo: "postback", titulo: TEXTOS_PADRAO.seguirBotao, payload: "ig:seguir:p1" },
      },
    });
  });

  it("2º comentário em aguardando_seguir, segue true: retomadaLink + link, link_enviado", () => {
    const r = decidirAoComentar(auto(), part("aguardando_seguir", 2), ctxC({ segue: true }));
    expect(r[1]).toMatchObject({
      tipo: "resposta_privada",
      mensagem: {
        texto: TEXTOS_PADRAO.retomadaLinkTexto,
        botao: { tipo: "link", titulo: "Abrir", url: URL },
      },
      situacao: "link_enviado",
    });
  });

  it.each(["link_enviado", "link_aberto"] as const)("2º comentário em %s: retomadaLink + link", (s) => {
    const r = decidirAoComentar(auto(), part(s, 2), ctxC());
    expect(r[1]).toMatchObject({
      tipo: "resposta_privada",
      mensagem: { texto: TEXTOS_PADRAO.retomadaLinkTexto, botao: { tipo: "link", url: URL } },
    });
  });

  it("3º comentário: só o aviso", () => {
    expect(decidirAoComentar(auto(), part("link_enviado", 3), ctxC())).toEqual([
      { tipo: "aviso", texto: "comentou 3+ vezes" },
    ]);
  });

  it("nunca devolve agendar_lembrete nem cancelar_lembretes", () => {
    const sits = [null, "aguardando_botao", "aguardando_seguir", "link_enviado", "link_aberto"] as const;
    for (const s of sits) {
      for (const n of [1, 2, 3]) {
        for (const segue of [true, false, null]) {
          const r = decidirAoComentar(auto(), part(s, n), ctxC({ segue }));
          expect(r.some((x) => x.tipo === "agendar_lembrete" || x.tipo === "cancelar_lembretes")).toBe(false);
        }
      }
    }
  });
});

describe("decidirAoTocar", () => {
  it("b1 sem exigirSeguir: link, link_enviado, cancela e agenda em +2h", () => {
    const r = decidirAoTocar(auto(), { id: "p1", situacao: "aguardando_botao" }, "b1", ctxT(false));
    expect(r).toEqual([
      {
        tipo: "mensagem",
        mensagem: { texto: "LINK", botao: { tipo: "link", titulo: "Abrir", url: URL } },
        situacao: "link_enviado",
      },
      { tipo: "cancelar_lembretes" },
      { tipo: "agendar_lembrete", enviarApos: new Date(agora.getTime() + 2 * HORA) },
    ]);
  });

  it("b1 com exigirSeguir e segue false: pede para seguir, aguardando_seguir, agenda lembrete", () => {
    const r = decidirAoTocar(
      auto({ exigirSeguir: true }),
      { id: "p1", situacao: "aguardando_botao" },
      "b1",
      ctxT(false),
    );
    expect(r[0]).toEqual({
      tipo: "mensagem",
      mensagem: {
        texto: TEXTOS_PADRAO.seguirTexto,
        botao: { tipo: "postback", titulo: TEXTOS_PADRAO.seguirBotao, payload: "ig:seguir:p1" },
      },
      situacao: "aguardando_seguir",
    });
    expect(r.map((x) => x.tipo)).toEqual(["mensagem", "cancelar_lembretes", "agendar_lembrete"]);
  });

  it("b1 com exigirSeguir e segue null: link (falha aberta)", () => {
    const r = decidirAoTocar(
      auto({ exigirSeguir: true }),
      { id: "p1", situacao: "aguardando_botao" },
      "b1",
      ctxT(null),
    );
    expect(r[0]).toMatchObject({ tipo: "mensagem", situacao: "link_enviado" });
  });

  it("seguir com segue false: insiste, sem novo lembrete", () => {
    const r = decidirAoTocar(
      auto({ exigirSeguir: true }),
      { id: "p1", situacao: "aguardando_seguir" },
      "seguir",
      ctxT(false),
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      tipo: "mensagem",
      mensagem: {
        texto: TEXTOS_PADRAO.seguirInsisteTexto,
        botao: { tipo: "postback", payload: "ig:seguir:p1" },
      },
    });
    expect(r.some((x) => x.tipo === "agendar_lembrete")).toBe(false);
  });

  it("seguir com segue true: entrega o link", () => {
    const r = decidirAoTocar(auto(), { id: "p1", situacao: "aguardando_seguir" }, "seguir", ctxT(true));
    expect(r[0]).toMatchObject({ tipo: "mensagem", situacao: "link_enviado" });
  });

  it("lembreteAtivo false: nenhum agendar_lembrete", () => {
    const r = decidirAoTocar(
      auto({ lembreteAtivo: false }),
      { id: "p1", situacao: "aguardando_botao" },
      "b1",
      ctxT(true),
    );
    expect(r.some((x) => x.tipo === "agendar_lembrete")).toBe(false);
  });
});

describe("toque depois de link_aberto", () => {
  it("reenvia o link sem mudar situação nem mexer em lembretes", () => {
    const r = decidirAoTocar(auto(), { id: "p1", situacao: "link_aberto" }, "b1", ctxT(null));
    expect(r).toEqual([
      { tipo: "mensagem", mensagem: { texto: "LINK", botao: { tipo: "link", titulo: "Abrir", url: URL } } },
    ]);
  });
});

describe("momentoDoLembrete", () => {
  it("usa agora + horas quando cabe na janela", () => {
    expect(momentoDoLembrete(agora, 23, new Date(agora.getTime() + 24 * HORA))).toEqual(
      new Date(agora.getTime() + 23 * HORA),
    );
  });
  it("limita a janela - 5 min", () => {
    expect(momentoDoLembrete(agora, 23, new Date(agora.getTime() + 10 * HORA))).toEqual(
      new Date(agora.getTime() + 10 * HORA - 5 * 60_000),
    );
  });
});

describe("decidirLembrete", () => {
  const janela = new Date(agora.getTime() + HORA).toISOString();
  it("link_aberto: nada", () => {
    expect(decidirLembrete(auto(), { situacao: "link_aberto", janelaAte: janela }, { urlCurta: URL, agora })).toEqual([]);
  });
  it("lembrete desativado: nada", () => {
    expect(
      decidirLembrete(auto({ lembreteAtivo: false }), { situacao: "link_enviado", janelaAte: janela }, { urlCurta: URL, agora }),
    ).toEqual([]);
  });
  it("janela vencida: nada", () => {
    const vencida = new Date(agora.getTime() - 1000).toISOString();
    expect(decidirLembrete(auto(), { situacao: "link_enviado", janelaAte: vencida }, { urlCurta: URL, agora })).toEqual([]);
  });
  it("aguardando_seguir: link no lembrete e link_enviado", () => {
    expect(
      decidirLembrete(auto(), { situacao: "aguardando_seguir", janelaAte: janela }, { urlCurta: URL, agora }),
    ).toEqual([
      {
        tipo: "mensagem",
        mensagem: {
          texto: TEXTOS_PADRAO.lembreteTexto,
          botao: { tipo: "link", titulo: "Abrir", url: URL },
        },
        situacao: "link_enviado",
      },
    ]);
  });
});
