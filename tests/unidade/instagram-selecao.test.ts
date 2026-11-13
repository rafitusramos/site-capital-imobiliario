import { describe, it, expect } from "vitest";
import { escolherAutomacao } from "@/lib/instagram/selecao";
import type { Automacao } from "@/lib/instagram/tipos";

function auto(p: Partial<Automacao>): Automacao {
  return {
    id: "a",
    nome: "n",
    slug: "s",
    ativa: true,
    alvo: "qualquer",
    midiaId: null,
    proximaDesde: null,
    palavras: null,
    responderPublico: true,
    frasesPublicas: [],
    dm1Texto: "",
    dm1Botao: "",
    exigirSeguir: false,
    seguirTexto: "",
    seguirBotao: "",
    seguirInsisteTexto: "",
    linkTexto: "",
    linkBotao: "",
    linkUrl: "",
    lembreteAtivo: true,
    lembreteHoras: 2,
    lembreteTexto: "",
    retomadaBotaoTexto: "",
    retomadaSeguirTexto: "",
    retomadaLinkTexto: "",
    criadoEm: "2026-01-01T00:00:00Z",
    ...p,
  };
}

const c = { midiaId: "m1", texto: "avaliar", midiaCriadaEm: "2026-11-10T12:00:00Z" };

describe("escolherAutomacao", () => {
  it("específica vence qualquer", () => {
    const r = escolherAutomacao(
      [auto({ id: "q" }), auto({ id: "e", alvo: "especifica", midiaId: "m1" })],
      c,
    );
    expect(r?.automacao.id).toBe("e");
    expect(r?.vincular).toBe(false);
  });
  it("específica de outra mídia não vale", () => {
    const r = escolherAutomacao([auto({ id: "e", alvo: "especifica", midiaId: "m2" })], c);
    expect(r).toBeNull();
  });
  it("proxima vinculada conta como específica", () => {
    const r = escolherAutomacao(
      [
        auto({ id: "q" }),
        auto({ id: "p", alvo: "proxima", midiaId: "m1", proximaDesde: "2026-11-01T00:00:00Z" }),
      ],
      c,
    );
    expect(r?.automacao.id).toBe("p");
    expect(r?.vincular).toBe(false);
  });
  it("proxima sem vínculo vincula mídia mais nova", () => {
    const r = escolherAutomacao(
      [auto({ id: "p", alvo: "proxima", proximaDesde: "2026-11-01T00:00:00Z" })],
      c,
    );
    expect(r?.automacao.id).toBe("p");
    expect(r?.vincular).toBe(true);
  });
  it("proxima sem vínculo não vincula mídia mais antiga", () => {
    const r = escolherAutomacao(
      [auto({ id: "p", alvo: "proxima", proximaDesde: "2026-11-11T00:00:00Z" })],
      c,
    );
    expect(r).toBeNull();
  });
  it("proxima sem vínculo não vincula sem data da mídia", () => {
    const r = escolherAutomacao(
      [auto({ id: "p", alvo: "proxima", proximaDesde: "2026-11-01T00:00:00Z" })],
      { ...c, midiaCriadaEm: null },
    );
    expect(r).toBeNull();
  });
  it("proxima vinculada a outra mídia não vale", () => {
    const r = escolherAutomacao(
      [auto({ id: "p", alvo: "proxima", midiaId: "m2", proximaDesde: "2026-11-01T00:00:00Z" })],
      c,
    );
    expect(r).toBeNull();
  });
  it("pausada nunca é escolhida", () => {
    const r = escolherAutomacao([auto({ id: "q", ativa: false })], c);
    expect(r).toBeNull();
  });
  it("palavra que não casa na específica deixa a qualquer ganhar", () => {
    const r = escolherAutomacao(
      [
        auto({ id: "e", alvo: "especifica", midiaId: "m1", palavras: ["simular"] }),
        auto({ id: "q", palavras: ["avaliar"] }),
      ],
      c,
    );
    expect(r?.automacao.id).toBe("q");
  });
  it("empate vai para a mais recente", () => {
    const r = escolherAutomacao(
      [
        auto({ id: "velha", criadoEm: "2026-01-01T00:00:00Z" }),
        auto({ id: "nova", criadoEm: "2026-06-01T00:00:00Z" }),
      ],
      c,
    );
    expect(r?.automacao.id).toBe("nova");
  });
  it("lista vazia devolve null", () => {
    expect(escolherAutomacao([], c)).toBeNull();
  });
});
