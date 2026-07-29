import { afterEach, describe, expect, test, vi } from "vitest";
import { capturarUtm } from "@/lib/utm";

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
