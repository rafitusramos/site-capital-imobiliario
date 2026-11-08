import { describe, expect, it } from "vitest";
import { destinoInternoDoClique, houveAlteracao } from "@/lib/admin/alteracoes";

describe("houveAlteracao", () => {
  it("objetos iguais, mesmo com ordem de chaves diferente, não são alteração", () => {
    expect(houveAlteracao({ a: 1, b: "x" }, { b: "x", a: 1 })).toBe(false);
  });
  it("valor diferente é alteração", () => {
    expect(houveAlteracao({ a: 1 }, { a: 2 })).toBe(true);
  });
  it("lista aninhada alterada é alteração", () => {
    expect(houveAlteracao({ l: [{ n: 1 }] }, { l: [{ n: 1 }, { n: 2 }] })).toBe(true);
  });
  it("undefined e ausente são equivalentes", () => {
    expect(houveAlteracao({ a: 1, b: undefined }, { a: 1 })).toBe(false);
  });
});

describe("destinoInternoDoClique", () => {
  const origem = "https://exemplo.com";
  const atual = "/admin/posts/1";
  const base = { origem, atual, alvo: "", download: false, modificador: false };

  it("link interno do admin devolve caminho com query", () => {
    expect(destinoInternoDoClique({ ...base, href: "/admin/posts?x=1" })).toBe("/admin/posts?x=1");
  });
  it("link absoluto da mesma origem é interno", () => {
    expect(destinoInternoDoClique({ ...base, href: "https://exemplo.com/admin/crm" })).toBe("/admin/crm");
  });
  it("outra origem não intercepta", () => {
    expect(destinoInternoDoClique({ ...base, href: "https://outro.com/x" })).toBeNull();
  });
  it("nova aba, download e tecla modificadora não interceptam", () => {
    expect(destinoInternoDoClique({ ...base, href: "/admin/x", alvo: "_blank" })).toBeNull();
    expect(destinoInternoDoClique({ ...base, href: "/admin/x", download: true })).toBeNull();
    expect(destinoInternoDoClique({ ...base, href: "/admin/x", modificador: true })).toBeNull();
  });
  it("âncora na própria página não intercepta", () => {
    expect(destinoInternoDoClique({ ...base, href: "#slug" })).toBeNull();
    expect(destinoInternoDoClique({ ...base, href: "/admin/posts/1#slug" })).toBeNull();
  });
  it("mailto e tel não interceptam", () => {
    expect(destinoInternoDoClique({ ...base, href: "mailto:a@b.com" })).toBeNull();
  });
  it("href vazio ou nulo não intercepta", () => {
    expect(destinoInternoDoClique({ ...base, href: null })).toBeNull();
  });
  it("link do site público (fora de /admin) também é interceptado, pois descarta a edição", () => {
    expect(destinoInternoDoClique({ ...base, href: "/blog/" })).toBe("/blog/");
  });
});
