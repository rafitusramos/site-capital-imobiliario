import { describe, expect, it } from "vitest";
import { variantesDoWaId, waIdDoTelefone } from "@/lib/whatsapp/telefone";

describe("waIdDoTelefone", () => {
  it("normaliza celular com máscara", () => {
    expect(waIdDoTelefone("(19) 99999-1234")).toBe("5519999991234");
  });
  it("aceita o 55 já presente", () => {
    expect(waIdDoTelefone("+55 19 99999-1234")).toBe("5519999991234");
  });
  it("aceita fixo", () => {
    expect(waIdDoTelefone("19 3333-4444")).toBe("551933334444");
  });
  it("rejeita curto e vazio", () => {
    expect(waIdDoTelefone("123")).toBeNull();
    expect(waIdDoTelefone("")).toBeNull();
  });
  it("rejeita lixo e tamanhos inválidos", () => {
    expect(waIdDoTelefone("abc")).toBeNull();
    expect(waIdDoTelefone("5519999991234999")).toBeNull();
  });
});

describe("variantesDoWaId", () => {
  it("sem o 9 gera a forma com 9", () => {
    expect(variantesDoWaId("551999991234")).toContain("5519999991234");
  });
  it("com o 9 gera a forma sem 9", () => {
    expect(variantesDoWaId("5519999991234")).toContain("551999991234");
  });
  it("sempre inclui o original", () => {
    expect(variantesDoWaId("5519999991234")).toContain("5519999991234");
    expect(variantesDoWaId("551999991234")).toContain("551999991234");
  });
  it("fixo não ganha variante com 9", () => {
    expect(variantesDoWaId("551933334444")).toEqual(["551933334444"]);
  });
  it("fora do Brasil devolve só o próprio", () => {
    expect(variantesDoWaId("14155551234")).toEqual(["14155551234"]);
  });
});
