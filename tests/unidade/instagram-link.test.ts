import { describe, expect, it } from "vitest";
import { destinoComUtm, ehRoboDePrevia, gerarCodigo, urlCurta } from "@/lib/instagram/link";

describe("link curto", () => {
  it("gera código de 10 caracteres", () => {
    for (let i = 0; i < 50; i++) expect(gerarCodigo()).toMatch(/^[a-z0-9]{10}$/);
  });
  it("monta a URL curta", () => {
    expect(urlCurta("abc1234567")).toBe("https://rtcapitalimobiliario.com.br/ir/abc1234567/");
  });
});

describe("destinoComUtm", () => {
  it("acrescenta UTM preservando hash", () => {
    expect(destinoComUtm("https://rtcapitalimobiliario.com.br/financiamento/#simulador", "parcela")).toBe(
      "https://rtcapitalimobiliario.com.br/financiamento/?utm_source=instagram&utm_medium=dm&utm_campaign=parcela#simulador",
    );
  });
  it("não mexe em host externo", () => {
    expect(destinoComUtm("https://wa.me/5519999", "x")).toBe("https://wa.me/5519999");
  });
  it("não sobrescreve UTM existente e preserva query", () => {
    const u = destinoComUtm("https://rtcapitalimobiliario.com.br/?utm_source=ads&a=1", "x");
    expect(u).toContain("utm_source=ads");
    expect(u).not.toContain("utm_source=instagram");
    expect(u).toContain("a=1");
    expect(u).toContain("utm_medium=dm");
  });
  it("devolve a entrada se a URL for inválida", () => {
    expect(destinoComUtm("não é url", "x")).toBe("não é url");
  });
});

describe("ehRoboDePrevia", () => {
  it("reconhece robôs da Meta", () => {
    expect(ehRoboDePrevia("facebookexternalhit/1.1")).toBe(true);
    expect(ehRoboDePrevia("Facebot")).toBe(true);
    expect(ehRoboDePrevia("meta-externalagent/1.1")).toBe(true);
    expect(ehRoboDePrevia("Meta-ExternalFetcher/1.1")).toBe(true);
  });
  it("não pega pessoa", () => {
    expect(ehRoboDePrevia("Mozilla/5.0 (iPhone) ... Instagram 300.0.0")).toBe(false);
    expect(ehRoboDePrevia(null)).toBe(false);
  });
});
