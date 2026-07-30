import { afterEach, describe, expect, test, vi } from "vitest";
import { capturarUtm, capturarAtribuicaoNaEntrada } from "@/lib/utm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("capturarUtm", () => {
  test("lê os cinco campos quando todos estão presentes", () => {
    vi.stubGlobal("window", {
      location: {
        search:
          "?utm_source=google&utm_medium=cpc&utm_campaign=lancamento&utm_term=home-equity&utm_content=anuncio1",
      },
    });
    expect(capturarUtm()).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "lancamento",
      utm_term: "home-equity",
      utm_content: "anuncio1",
    });
  });

  test("só os campos presentes na query vêm no resultado", () => {
    vi.stubGlobal("window", { location: { search: "?utm_source=google&utm_medium=cpc" } });
    expect(capturarUtm()).toEqual({ utm_source: "google", utm_medium: "cpc" });
  });

  test("parâmetros que não são UTM são ignorados", () => {
    vi.stubGlobal("window", { location: { search: "?utm_source=google&outro_param=xyz" } });
    expect(capturarUtm()).toEqual({ utm_source: "google" });
  });

  test("query vazia devolve objeto vazio", () => {
    vi.stubGlobal("window", { location: { search: "" } });
    expect(capturarUtm()).toEqual({});
  });

  test("sem window definido devolve objeto vazio", () => {
    vi.stubGlobal("window", undefined);
    expect(capturarUtm()).toEqual({});
  });
});

function criarSessionStorageFalso() {
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

function stubWindowComSessao(
  search: string,
  hostname = "rtcapitalimobiliario.com.br",
  sessionStorage = criarSessionStorageFalso(),
) {
  vi.stubGlobal("window", { location: { search, hostname }, sessionStorage });
  return sessionStorage;
}

describe("capturarAtribuicaoNaEntrada + capturarUtm — captura por sessão", () => {
  test("extrai utm, gclid, fbclid, wbraid e gbraid da URL e persiste na sessão", () => {
    stubWindowComSessao("?utm_source=google&gclid=abc123&fbclid=xyz789&wbraid=w1&gbraid=g1");

    capturarAtribuicaoNaEntrada();

    expect(capturarUtm()).toEqual({
      utm_source: "google",
      gclid: "abc123",
      fbclid: "xyz789",
      wbraid: "w1",
      gbraid: "g1",
    });
  });

  test("primeiro toque vence: navegação posterior sem parâmetros não sobrescreve a captura da sessão", () => {
    const sessionStorage = criarSessionStorageFalso();
    stubWindowComSessao("?utm_source=google&utm_campaign=lancamento", "site.com.br", sessionStorage);
    capturarAtribuicaoNaEntrada();

    // Simula navegação para outra página, dentro da MESMA sessão (mesmo
    // sessionStorage), sem parâmetros de campanha na URL.
    stubWindowComSessao("", "site.com.br", sessionStorage);
    capturarAtribuicaoNaEntrada();

    expect(capturarUtm()).toEqual({ utm_source: "google", utm_campaign: "lancamento" });
  });

  test("uma segunda captura com parâmetros diferentes também não sobrescreve o primeiro toque", () => {
    const sessionStorage = criarSessionStorageFalso();
    stubWindowComSessao("?utm_source=google", "site.com.br", sessionStorage);
    capturarAtribuicaoNaEntrada();

    stubWindowComSessao("?utm_source=facebook&utm_campaign=outra", "site.com.br", sessionStorage);
    capturarAtribuicaoNaEntrada();

    expect(capturarUtm()).toEqual({ utm_source: "google" });
  });

  test("capturarUtm devolve Record<string, string> lido da sessão (assinatura preservada)", () => {
    stubWindowComSessao("?utm_source=google");
    capturarAtribuicaoNaEntrada();

    const resultado = capturarUtm();
    expect(typeof resultado).toBe("object");
    for (const valor of Object.values(resultado)) {
      expect(typeof valor).toBe("string");
    }
  });
});

describe("referrer externo — trade-off consciente de sessionStorage", () => {
  test("referrer de outro domínio é incluído na atribuição", () => {
    vi.stubGlobal("document", { referrer: "https://www.google.com/search?q=financiamento" });
    stubWindowComSessao("", "rtcapitalimobiliario.com.br");

    capturarAtribuicaoNaEntrada();

    expect(capturarUtm()).toEqual({ referrer: "https://www.google.com/search?q=financiamento" });
  });

  test("referrer do próprio site (navegação interna) não é incluído", () => {
    vi.stubGlobal("document", { referrer: "https://rtcapitalimobiliario.com.br/blog/" });
    stubWindowComSessao("", "rtcapitalimobiliario.com.br");

    capturarAtribuicaoNaEntrada();

    expect(capturarUtm()).toEqual({});
  });

  test("sem document.referrer não gera a chave referrer", () => {
    vi.stubGlobal("document", { referrer: "" });
    stubWindowComSessao("?utm_source=google");

    capturarAtribuicaoNaEntrada();

    expect(capturarUtm()).toEqual({ utm_source: "google" });
  });
});
