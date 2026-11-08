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

describe("capaDaPagina — capa_origem do pronto", () => {
  const imagens = [img("c.jpg", "empreendimento"), img("u.jpg", "decorado")];

  test("condominio: primeira do condomínio mesmo havendo foto da unidade", () => {
    expect(capaDaPagina(imagens, "pronto", "condominio")).toBe("c.jpg");
  });

  test("unidade é o padrão quando a origem não é informada", () => {
    expect(capaDaPagina(imagens, "pronto")).toBe("u.jpg");
    expect(capaDaPagina(imagens, "pronto", "unidade")).toBe("u.jpg");
  });

  test("grupo escolhido vazio cai para o outro", () => {
    expect(capaDaPagina([img("u.jpg", "decorado")], "pronto", "condominio")).toBe("u.jpg");
    expect(capaDaPagina([img("c.jpg", "empreendimento")], "pronto", "unidade")).toBe("c.jpg");
  });

  test("lançamento ignora a origem", () => {
    expect(capaDaPagina(imagens, "lancamento", "unidade")).toBe("c.jpg");
  });
});

describe("capaDoCard — capa_origem do pronto", () => {
  const imagens = [img("c.jpg", "empreendimento", 0, true), img("u.jpg", "decorado")];

  test("condominio escolhe o grupo do condomínio; unidade, o da unidade", () => {
    expect(capaDoCard(imagens, "pronto", "condominio")).toBe("c.jpg");
    expect(capaDoCard(imagens, "pronto", "unidade")).toBe("u.jpg");
    expect(capaDoCard(imagens, "pronto")).toBe("u.jpg");
  });

  test("grupo escolhido vazio cai para o outro", () => {
    expect(capaDoCard([img("u.jpg", "decorado")], "pronto", "condominio")).toBe("u.jpg");
  });

  test("lançamento ignora a origem", () => {
    expect(capaDoCard([img("u.jpg", "decorado", 0), img("e.jpg", "empreendimento", 1, true)], "lancamento", "unidade")).toBe("e.jpg");
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
