import { describe, expect, test } from "vitest";
import {
  dormitoriosParaFiltro,
  fatosDoImovel,
  custosMensaisDoPronto,
  fichaDoPronto,
  precoDoImovel,
  rotuloModalidade,
  valorParaFiltro,
} from "@/lib/imoveis/ficha";

const pronto = {
  modalidade: "pronto" as const,
  area_util: 180,
  area_total: 300,
  dormitorios: 3,
  suites: 1,
  banheiros: 3,
  vagas: 2,
  andar: null,
  mobiliado: true,
  ano_construcao: 2018,
  valor_condominio: 900,
  valor_iptu: 450,
  nome_condominio: "Residencial Marambaia",
};

describe("rotuloModalidade", () => {
  test("rótulos públicos", () => {
    expect(rotuloModalidade("lancamento")).toBe("Lançamento");
    expect(rotuloModalidade("pronto")).toBe("Pronto");
  });
});

describe("fichaDoPronto", () => {
  test("lista só o que está preenchido, na ordem de leitura", () => {
    expect(fichaDoPronto(pronto).map((f) => f.rotulo)).toEqual([
      "Área útil",
      "Área total",
      "Dormitórios",
      "Suítes",
      "Banheiros",
      "Vagas",
      "Mobiliado",
      "Ano de construção",
    ]);
  });

  test("não repete condomínio e IPTU: ficam só no hero (custosMensaisDoPronto)", () => {
    const rotulos = fichaDoPronto(pronto).map((f) => f.rotulo);
    expect(rotulos).not.toContain("Condomínio");
    expect(rotulos).not.toContain("IPTU");
  });

  test("formata os valores", () => {
    const ficha = Object.fromEntries(fichaDoPronto(pronto).map((f) => [f.rotulo, f.valor]));
    expect(ficha["Área útil"]).toBe("180 m²");
    expect(ficha["Dormitórios"]).toBe("3");
    expect(ficha["Mobiliado"]).toBe("Sim");
    expect(ficha["Condomínio"]).toBeUndefined();
  });

  test("andar 0 é térreo; mobiliado false é Não; null some", () => {
    const ficha = Object.fromEntries(
      fichaDoPronto({ ...pronto, andar: 0, mobiliado: false, area_total: null }).map((f) => [f.rotulo, f.valor]),
    );
    expect(ficha["Andar"]).toBe("Térreo");
    expect(ficha["Mobiliado"]).toBe("Não");
    expect(ficha["Área total"]).toBeUndefined();
  });

  test("andar numerado", () => {
    const ficha = Object.fromEntries(fichaDoPronto({ ...pronto, andar: 7 }).map((f) => [f.rotulo, f.valor]));
    expect(ficha["Andar"]).toBe("7º");
  });
});

describe("fatosDoImovel", () => {
  test("pronto usa valores únicos", () => {
    expect(fatosDoImovel(pronto)).toEqual({ area: "180 m²", dormitorios: "3 dorms", vagas: "2 vagas" });
  });

  test("lançamento usa as faixas", () => {
    expect(
      fatosDoImovel({
        modalidade: "lancamento",
        area_min: 54,
        area_max: 69,
        dormitorios_min: 2,
        dormitorios_max: 3,
        vagas_min: 1,
        vagas_max: 2,
      }),
    ).toEqual({ area: "54 a 69 m²", dormitorios: "2 e 3 dorms", vagas: "1 a 2 vagas" });
  });
});

describe("precoDoImovel", () => {
  test("pronto: rótulo 'Valor de venda'", () => {
    expect(precoDoImovel({ modalidade: "pronto", valor_sob_consulta: false, valor_venda: 1250000, valor_a_partir_de: null })).toEqual({
      rotulo: "Valor de venda",
      valor: expect.stringMatching(/1\.250\.000/),
    });
  });

  test("lançamento: 'A partir de'", () => {
    expect(
      precoDoImovel({ modalidade: "lancamento", valor_sob_consulta: false, valor_venda: null, valor_a_partir_de: 500000 })?.rotulo,
    ).toBe("A partir de");
  });

  test("sob consulta e sem valor não mostram preço", () => {
    expect(precoDoImovel({ modalidade: "pronto", valor_sob_consulta: true, valor_venda: 1, valor_a_partir_de: null })).toBeNull();
    expect(precoDoImovel({ modalidade: "pronto", valor_sob_consulta: false, valor_venda: null, valor_a_partir_de: null })).toBeNull();
  });
});

describe("dormitoriosParaFiltro", () => {
  test("pronto é uma faixa de um valor só", () => {
    expect(dormitoriosParaFiltro({ modalidade: "pronto", dormitorios: 3 })).toEqual([3, 3]);
  });
  test("lançamento usa min/max e completa o lado que falta", () => {
    expect(dormitoriosParaFiltro({ modalidade: "lancamento", dormitorios_min: 2, dormitorios_max: 3 })).toEqual([2, 3]);
    expect(dormitoriosParaFiltro({ dormitorios_min: 2, dormitorios_max: null })).toEqual([2, 2]);
  });
  test("sem dado, null", () => {
    expect(dormitoriosParaFiltro({ modalidade: "pronto", dormitorios: null })).toBeNull();
    expect(dormitoriosParaFiltro({ dormitorios_min: null, dormitorios_max: null })).toBeNull();
  });
});

describe("valorParaFiltro", () => {
  test("pronto usa valor_venda; lançamento usa valor_a_partir_de", () => {
    expect(valorParaFiltro({ modalidade: "pronto", valor_sob_consulta: false, valor_venda: 900000, valor_a_partir_de: 1 })).toBe(900000);
    expect(valorParaFiltro({ modalidade: "lancamento", valor_sob_consulta: false, valor_venda: 1, valor_a_partir_de: 500000 })).toBe(500000);
  });
  test("sob consulta não tem valor para comparar", () => {
    expect(valorParaFiltro({ modalidade: "pronto", valor_sob_consulta: true, valor_venda: 900000, valor_a_partir_de: null })).toBeNull();
  });
});

describe("custosMensaisDoPronto", () => {
  test("condomínio e IPTU com /mês, na ordem, só o que existe", () => {
    expect(custosMensaisDoPronto({ valor_condominio: 900, valor_iptu: 450 })).toEqual([
      { rotulo: "Condomínio", valor: expect.stringMatching(/R\$\s900\/mês/) },
      { rotulo: "IPTU", valor: expect.stringMatching(/R\$\s450\/mês/) },
    ]);
    expect(custosMensaisDoPronto({ valor_condominio: null, valor_iptu: 450 }).map((i) => i.rotulo)).toEqual(["IPTU"]);
    expect(custosMensaisDoPronto({ valor_condominio: null, valor_iptu: null })).toEqual([]);
  });
});
