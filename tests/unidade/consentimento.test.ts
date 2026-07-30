import { afterEach, describe, expect, test, vi } from "vitest";
import {
  lerConsentimento,
  definirConsentimento,
  limparConsentimento,
  podeRastrear,
  EVENTO_CONSENTIMENTO,
  CHAVE_CONSENTIMENTO,
} from "@/lib/consentimento";

function criarLocalStorageFalso() {
  const dados = new Map<string, string>();
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

function stubWindow() {
  const localStorage = criarLocalStorageFalso();
  const eventosDisparados: CustomEvent[] = [];
  const win = {
    localStorage,
    dispatchEvent: (e: CustomEvent) => {
      eventosDisparados.push(e);
      return true;
    },
  };
  vi.stubGlobal("window", win);
  return { win, eventosDisparados };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("podeRastrear — postura opt-out escolhida pelo dono", () => {
  test("null (ainda não respondeu) permite rastrear", () => {
    expect(podeRastrear(null)).toBe(true);
  });

  test("'aceito' permite rastrear", () => {
    expect(podeRastrear("aceito")).toBe(true);
  });

  test("'recusado' é o único estado que NÃO permite rastrear", () => {
    expect(podeRastrear("recusado")).toBe(false);
  });
});

describe("lerConsentimento", () => {
  test("sem window (SSR) devolve null", () => {
    vi.stubGlobal("window", undefined);
    expect(lerConsentimento()).toBeNull();
  });

  test("sem nada gravado no storage devolve null", () => {
    stubWindow();
    expect(lerConsentimento()).toBeNull();
  });

  test("lê de volta o que foi gravado por definirConsentimento", () => {
    stubWindow();
    definirConsentimento("aceito");
    expect(lerConsentimento()).toBe("aceito");
  });

  test("valor inesperado gravado na chave é tratado como null", () => {
    const { win } = stubWindow();
    win.localStorage.setItem(CHAVE_CONSENTIMENTO, "valor-corrompido");
    expect(lerConsentimento()).toBeNull();
  });
});

describe("definirConsentimento", () => {
  test("grava 'aceito' e dispara o evento com o novo estado no detail", () => {
    const { eventosDisparados } = stubWindow();
    definirConsentimento("aceito");

    expect(lerConsentimento()).toBe("aceito");
    expect(eventosDisparados).toHaveLength(1);
    expect(eventosDisparados[0].type).toBe(EVENTO_CONSENTIMENTO);
    expect(eventosDisparados[0].detail).toBe("aceito");
  });

  test("grava 'recusado' e dispara o evento correspondente", () => {
    const { eventosDisparados } = stubWindow();
    definirConsentimento("recusado");

    expect(lerConsentimento()).toBe("recusado");
    expect(eventosDisparados[0].detail).toBe("recusado");
  });
});

describe("limparConsentimento", () => {
  test("remove o estado gravado (volta a null) e dispara evento com detail null", () => {
    const { eventosDisparados } = stubWindow();
    definirConsentimento("recusado");

    limparConsentimento();

    expect(lerConsentimento()).toBeNull();
    expect(eventosDisparados[eventosDisparados.length - 1].detail).toBeNull();
  });
});

// Regressão de um defeito encontrado em navegador real: quando o navegador
// bloqueia armazenamento do site, o ACESSO a window.localStorage lança
// SecurityError — não devolve vazio. Sem tratamento, a exceção subia pelo
// useEffect de components/analytics/Tags e do BannerConsentimento e derrubava
// os dois: nem tag carregava, nem banner aparecia, silenciosamente.
describe("localStorage bloqueado (SecurityError no acesso)", () => {
  function stubWindowSemStorage() {
    const eventosDisparados: CustomEvent[] = [];
    const win = {
      get localStorage(): Storage {
        throw new DOMException("Access is denied for this document.", "SecurityError");
      },
      dispatchEvent: (e: CustomEvent) => {
        eventosDisparados.push(e);
        return true;
      },
      CustomEvent,
    };
    vi.stubGlobal("window", win);
    // O fallback em memória é estado de MÓDULO: sem zerar aqui, uma escolha
    // feita por um teste anterior vazaria para o próximo e tornaria estes
    // testes dependentes da ordem de execução. Os eventos do reset são
    // descartados para não contaminar as asserções de quantidade abaixo.
    limparConsentimento();
    eventosDisparados.length = 0;
    return { eventosDisparados };
  }

  test("lerConsentimento não lança e devolve null", () => {
    stubWindowSemStorage();
    expect(() => lerConsentimento()).not.toThrow();
    expect(lerConsentimento()).toBeNull();
  });

  test("null com storage bloqueado mantém a postura opt-out (rastreia e mostra banner)", () => {
    stubWindowSemStorage();
    expect(podeRastrear(lerConsentimento())).toBe(true);
  });

  test("definirConsentimento não lança e ainda dispara o evento", () => {
    const { eventosDisparados } = stubWindowSemStorage();
    expect(() => definirConsentimento("recusado")).not.toThrow();
    expect(eventosDisparados).toHaveLength(1);
    expect(eventosDisparados[0].detail).toBe("recusado");
  });

  test("a recusa vale na navegação atual, via fallback em memória", () => {
    stubWindowSemStorage();
    definirConsentimento("recusado");
    expect(lerConsentimento()).toBe("recusado");
    expect(podeRastrear(lerConsentimento())).toBe(false);
  });

  test("limparConsentimento não lança e volta o estado para null", () => {
    stubWindowSemStorage();
    definirConsentimento("recusado");
    limparConsentimento();
    expect(lerConsentimento()).toBeNull();
  });
});
