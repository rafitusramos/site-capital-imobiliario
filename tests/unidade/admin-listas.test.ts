import { describe, expect, it } from "vitest";
import {
  alternarOrdenacao,
  consultarLista,
  normalizarBusca,
  type ConfigLista,
} from "@/lib/admin/listas";

type Item = { titulo: string; slug: string; status: string; data: string | null };

const itens: Item[] = [
  { titulo: "Financiamento Imobiliário", slug: "financiamento", status: "published", data: "2025-03-01" },
  { titulo: "Consórcio: vale a pena?", slug: "consorcio-vale", status: "draft", data: null },
  { titulo: "Home Equity", slug: "home-equity", status: "published", data: "2025-01-10" },
];

const config: ConfigLista<Item> = {
  textos: (i) => [i.titulo, i.slug],
  status: (i) => i.status,
  ordenadores: { titulo: (i) => i.titulo, data: (i) => i.data },
};

describe("normalizarBusca", () => {
  it("ignora acento, caixa e espaços nas pontas", () => {
    expect(normalizarBusca("  CONSÓRCIO ")).toBe("consorcio");
  });
});

describe("consultarLista", () => {
  const base = { busca: "", status: "todos", ordem: null } as const;

  it("sem filtros devolve tudo na ordem original", () => {
    expect(consultarLista(itens, base, config)).toEqual(itens);
  });

  it("busca sem acento encontra título acentuado", () => {
    const r = consultarLista(itens, { ...base, busca: "consorcio" }, config);
    expect(r.map((i) => i.slug)).toEqual(["consorcio-vale"]);
  });

  it("busca também casa o slug", () => {
    const r = consultarLista(itens, { ...base, busca: "HOME-EQ" }, config);
    expect(r.map((i) => i.slug)).toEqual(["home-equity"]);
  });

  it("filtra por status", () => {
    const r = consultarLista(itens, { ...base, status: "draft" }, config);
    expect(r).toHaveLength(1);
  });

  it("ordena por título ascendente ignorando acento e caixa", () => {
    const r = consultarLista(itens, { ...base, ordem: { coluna: "titulo", direcao: "asc" } }, config);
    expect(r.map((i) => i.slug)).toEqual(["consorcio-vale", "financiamento", "home-equity"]);
  });

  it("ordena por data descendente e manda valores nulos para o fim", () => {
    const r = consultarLista(itens, { ...base, ordem: { coluna: "data", direcao: "desc" } }, config);
    expect(r.map((i) => i.slug)).toEqual(["financiamento", "home-equity", "consorcio-vale"]);
  });

  it("nulos vão para o fim também em ascendente", () => {
    const r = consultarLista(itens, { ...base, ordem: { coluna: "data", direcao: "asc" } }, config);
    expect(r.map((i) => i.slug)).toEqual(["home-equity", "financiamento", "consorcio-vale"]);
  });

  it("não muta o array de entrada", () => {
    const copia = [...itens];
    consultarLista(itens, { ...base, ordem: { coluna: "titulo", direcao: "desc" } }, config);
    expect(itens).toEqual(copia);
  });
});

describe("alternarOrdenacao", () => {
  it("coluna nova começa ascendente", () => {
    expect(alternarOrdenacao(null, "titulo")).toEqual({ coluna: "titulo", direcao: "asc" });
  });
  it("mesma coluna inverte e na terceira volta limpa", () => {
    const asc = alternarOrdenacao(null, "titulo");
    const desc = alternarOrdenacao(asc, "titulo");
    expect(desc).toEqual({ coluna: "titulo", direcao: "desc" });
    expect(alternarOrdenacao(desc, "titulo")).toBeNull();
  });
  it("trocar de coluna reinicia em ascendente", () => {
    expect(alternarOrdenacao({ coluna: "titulo", direcao: "desc" }, "data")).toEqual({
      coluna: "data",
      direcao: "asc",
    });
  });
});
