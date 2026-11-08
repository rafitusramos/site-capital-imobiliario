import { describe, expect, test } from "vitest";
import { capaDaPagina, capaDoCard } from "@/lib/imoveis/capa";

const img = (url: string, grupo: string, ordem = 0, destaque = false) => ({ url, grupo, ordem, destaque });

describe("capaDaPagina", () => {
  test("lançamento: primeira do empreendimento, senão a primeira de todas", () => {
    const imagens = [img("d.jpg", "decorado"), img("e.jpg", "empreendimento", 1)];
    expect(capaDaPagina(imagens, "lancamento")).toBe("e.jpg");
    expect(capaDaPagina([img("d.jpg", "decorado")], "lancamento")).toBe("d.jpg");
    expect(capaDaPagina([], "lancamento")).toBeNull();
  });

  test("pronto: primeira da unidade (decorado) antes do condomínio", () => {
    const imagens = [img("e.jpg", "empreendimento"), img("u.jpg", "decorado")];
    expect(capaDaPagina(imagens, "pronto")).toBe("u.jpg");
  });

  test("pronto sem unidade: cai para o condomínio, depois para qualquer uma", () => {
    expect(capaDaPagina([img("e.jpg", "empreendimento")], "pronto")).toBe("e.jpg");
    expect(capaDaPagina([img("p.jpg", "planta")], "pronto")).toBe("p.jpg");
  });
});

describe("capaDoCard", () => {
  test("lançamento: destaque, senão menor ordem (comportamento anterior)", () => {
    expect(capaDoCard([img("a.jpg", "decorado", 0), img("b.jpg", "empreendimento", 1, true)], "lancamento")).toBe("b.jpg");
    expect(capaDoCard([img("a.jpg", "decorado", 2), img("b.jpg", "empreendimento", 1)], "lancamento")).toBe("b.jpg");
    expect(capaDoCard(null, "lancamento")).toBeNull();
  });

  test("pronto: primeira da unidade mesmo que o destaque esteja no condomínio", () => {
    const imagens = [img("e.jpg", "empreendimento", 0, true), img("u.jpg", "decorado", 0)];
    expect(capaDoCard(imagens, "pronto")).toBe("u.jpg");
  });
});
