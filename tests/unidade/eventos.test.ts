import { afterEach, describe, expect, test, vi } from "vitest";
import { rastrear } from "@/lib/analytics/eventos";
import { CHAVE_CONSENTIMENTO } from "@/lib/consentimento";

function criarLocalStorageFalso(inicial?: Record<string, string>) {
  const dados = new Map<string, string>(Object.entries(inicial ?? {}));
  return {
    getItem: (chave: string) => (dados.has(chave) ? (dados.get(chave) as string) : null),
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor);
    },
    removeItem: (chave: string) => {
      dados.delete(chave);
    },
  };
}

function stubWindow(opts: { consentimento?: "aceito" | "recusado"; comGtag?: boolean; comFbq?: boolean } = {}) {
  const localStorage = criarLocalStorageFalso(
    opts.consentimento ? { [CHAVE_CONSENTIMENTO]: opts.consentimento } : undefined,
  );
  const gtag = opts.comGtag ? vi.fn() : undefined;
  const fbq = opts.comFbq ? vi.fn() : undefined;
  vi.stubGlobal("window", { localStorage, gtag, fbq });
  return { gtag, fbq };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rastrear — respeita o consentimento", () => {
  test("é no-op quando o estado é 'recusado', mesmo com gtag/fbq disponíveis", () => {
    const { gtag, fbq } = stubWindow({ consentimento: "recusado", comGtag: true, comFbq: true });

    rastrear({ nome: "lead_enviado", tipo: "financiamento" });

    expect(gtag).not.toHaveBeenCalled();
    expect(fbq).not.toHaveBeenCalled();
  });

  test("dispara normalmente quando o estado é null (ainda não respondeu) — postura opt-out", () => {
    const { gtag, fbq } = stubWindow({ comGtag: true, comFbq: true });

    rastrear({ nome: "lead_enviado", tipo: "financiamento" });

    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", { lead_type: "financiamento" });
    expect(fbq).toHaveBeenCalledWith("track", "Lead", { content_name: "financiamento" });
  });

  test("dispara normalmente quando o estado é 'aceito'", () => {
    const { gtag, fbq } = stubWindow({ consentimento: "aceito", comGtag: true, comFbq: true });

    rastrear({ nome: "whatsapp_clicado", contexto: "sucesso-home-equity" });

    expect(gtag).toHaveBeenCalledWith("event", "whatsapp_clicado", { contexto: "sucesso-home-equity" });
    expect(fbq).toHaveBeenCalledWith("trackCustom", "WhatsappClicado", { contexto: "sucesso-home-equity" });
  });
});

describe("rastrear — nunca lança exceção", () => {
  test("window.gtag e window.fbq ausentes não derrubam a chamada", () => {
    stubWindow();

    expect(() => rastrear({ nome: "simulador_usado", pagina: "financiamento" })).not.toThrow();
  });

  test("sem window (SSR) também não lança", () => {
    vi.stubGlobal("window", undefined);

    expect(() => rastrear({ nome: "lead_enviado", tipo: "imoveis" })).not.toThrow();
  });

  test("formulario_iniciado e simulador_usado mapeiam para os nomes esperados", () => {
    const { gtag, fbq } = stubWindow({ comGtag: true, comFbq: true });

    rastrear({ nome: "formulario_iniciado", tipo: "home-equity" });
    rastrear({ nome: "simulador_usado", pagina: "home-equity" });

    expect(gtag).toHaveBeenCalledWith("event", "formulario_iniciado", { lead_type: "home-equity" });
    expect(fbq).toHaveBeenCalledWith("trackCustom", "FormularioIniciado", { content_name: "home-equity" });
    expect(gtag).toHaveBeenCalledWith("event", "simulador_usado", { pagina: "home-equity" });
    expect(fbq).toHaveBeenCalledWith("trackCustom", "SimuladorUsado", { pagina: "home-equity" });
  });
});
