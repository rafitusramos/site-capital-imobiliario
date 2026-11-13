import { describe, expect, it } from "vitest";
import {
  automacaoNova,
  automacaoParaFormulario,
  formularioParaPayload,
} from "@/lib/instagram/formulario";
import { TEXTOS_PADRAO } from "@/lib/instagram/textos-padrao";
import type { AutomacaoPainel } from "@/lib/queries/admin-instagram";

describe("automacaoNova", () => {
  it("vem com os textos padrão e as opções iniciais", () => {
    const f = automacaoNova();
    expect(f.seguirTexto).toBe(TEXTOS_PADRAO.seguirTexto);
    expect(f.seguirBotao).toBe(TEXTOS_PADRAO.seguirBotao);
    expect(f.seguirInsisteTexto).toBe(TEXTOS_PADRAO.seguirInsisteTexto);
    expect(f.lembreteTexto).toBe(TEXTOS_PADRAO.lembreteTexto);
    expect(f.retomadaBotaoTexto).toBe(TEXTOS_PADRAO.retomadaBotaoTexto);
    expect(f.retomadaSeguirTexto).toBe(TEXTOS_PADRAO.retomadaSeguirTexto);
    expect(f.retomadaLinkTexto).toBe(TEXTOS_PADRAO.retomadaLinkTexto);
    expect(f.lembreteHoras).toBe(2);
    expect(f.lembreteAtivo).toBe(true);
    expect(f.responderPublico).toBe(true);
    expect(f.exigirSeguir).toBe(false);
    expect(f.id).toBeUndefined();
  });
});

describe("formularioParaPayload", () => {
  it("leva as palavras do array ao payload", () => {
    const p = formularioParaPayload({ ...automacaoNova(), palavras: ["Avaliar", "simular"], qualquerPalavra: false });
    expect(p.palavras).toEqual(["Avaliar", "simular"]);
  });

  it("qualquer palavra vira null", () => {
    const p = formularioParaPayload({ ...automacaoNova(), palavras: ["Avaliar"], qualquerPalavra: true });
    expect(p.palavras).toBeNull();
  });

  it("sem palavras e sem 'qualquer palavra' vira lista vazia (o schema recusa)", () => {
    const p = formularioParaPayload({ ...automacaoNova(), palavras: [], qualquerPalavra: false });
    expect(p.palavras).toEqual([]);
  });

  it("descarta frases públicas vazias e só limpa mídia quando o alvo não é específico", () => {
    const base = { ...automacaoNova(), frasesPublicas: ["  Olá  ", "", "  "], midiaId: "123", midiaThumb: "t", midiaPermalink: "p" };
    const esp = formularioParaPayload({ ...base, alvo: "especifica" });
    expect(esp.frasesPublicas).toEqual(["Olá"]);
    expect(esp.midiaId).toBe("123");
    const qq = formularioParaPayload({ ...base, alvo: "qualquer" });
    expect(qq.midiaId).toBeNull();
    expect(qq.midiaThumb).toBeNull();
  });

  it("carrega o id na edição", () => {
    expect(formularioParaPayload({ ...automacaoNova(), id: "abc" }).id).toBe("abc");
  });
});

describe("automacaoParaFormulario", () => {
  it("volta palavras para array e null para 'qualquer palavra'", () => {
    const base = formularioParaPayload(automacaoNova());
    const a = {
      ...base,
      id: "i1", slug: "s", ativa: true, proximaDesde: null, criadoEm: "2026-01-01T00:00:00Z",
      palavras: ["a", "b"], frasesPublicas: ["x"], midiaId: null, midiaPermalink: null, midiaThumb: null,
    } as unknown as AutomacaoPainel;
    const f = automacaoParaFormulario(a);
    expect(f.id).toBe("i1");
    expect(f.palavras).toEqual(["a", "b"]);
    expect(f.qualquerPalavra).toBe(false);
    const g = automacaoParaFormulario({ ...a, palavras: null });
    expect(g.qualquerPalavra).toBe(true);
    expect(g.palavras).toEqual([]);
  });
});
