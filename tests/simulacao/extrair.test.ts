import { describe, expect, test } from "vitest";
import { ErroExtracao, extrairDadosCreditas } from "@/lib/simulacao/extrair";
import { bancosFicticios, paginasFicticias } from "@/tests/apoio/palavras-creditas";

describe("extrairDadosCreditas", () => {
  test("lê valores, bancos, prazos, indexadores e a evolução", () => {
    const { dados, colunas } = extrairDadosCreditas(paginasFicticias());
    expect(dados.valor_imovel).toBe(400000);
    expect(dados.valor_financiamento).toBe(260000);
    expect(dados.renda_media).toBe(9000);
    expect(dados.data).toBe("06/11/2026");
    expect(dados.meses).toEqual([1, 12, 24]);
    expect(dados.bancos.map((b) => b.nome)).toEqual(["Banco Alfa", "Banco Beta", "Banco Gama", "Volpi"]);
    const alfa = dados.bancos[0];
    expect(alfa).toMatchObject({ taxa: 12.5, cet: 13.1, custo_total: 800000.5, prazo: 420, indexador: "TR", primeira: 3000, ultima: 650 });
    expect(alfa.parcelas).toEqual([3000, 2950.25, 2900]);
    expect(alfa.logo).toBeNull();
    expect(colunas.map((c) => c.nome)).toEqual(["Banco Alfa", "Banco Beta", "Banco Gama", "Volpi"]);
    expect(colunas[0].x1).toBeGreaterThan(colunas[0].x0);
  });

  test("agrupa nomes de banco em mais de uma palavra", () => {
    const bancos = bancosFicticios();
    expect(extrairDadosCreditas(paginasFicticias({ bancos })).dados.bancos[0].nome).toBe("Banco Alfa");
  });

  test("parcela '-' vira null", () => {
    const { dados } = extrairDadosCreditas(paginasFicticias());
    expect(dados.bancos[3].parcelas).toEqual([2700, 2690, null]);
  });

  test("sistema em branco é deduzido pela curva: última >= 85% da primeira é Price", () => {
    const { dados } = extrairDadosCreditas(paginasFicticias());
    expect(dados.bancos.map((b) => b.sistema)).toEqual(["SAC", "SAC", "SAC", "Price"]);
  });

  test("sistema informado no PDF é respeitado", () => {
    const { dados } = extrairDadosCreditas(paginasFicticias({ comSistema: true }));
    expect(dados.bancos.every((b) => b.sistema === "SAC")).toBe(true);
  });

  test("sem data no PDF a data fica vazia; sem renda fica null", () => {
    const { dados } = extrairDadosCreditas(paginasFicticias({ data: null, renda: null }));
    expect(dados.data).toBe("");
    expect(dados.renda_media).toBeNull();
  });

  test("PDF que não é da Creditas dá erro claro", () => {
    expect(() => extrairDadosCreditas([[{ texto: "Fatura de cartão", x: 10, y: 10, largura: 40 }]])).toThrow(ErroExtracao);
    expect(() => extrairDadosCreditas([[]])).toThrow(/Creditas/);
  });

  test("linha faltando é erro, nunca dado parcial", () => {
    const [p1, p2] = paginasFicticias();
    const semCet = p1.filter((w) => !(w.y > 410 && w.y < 414));
    expect(() => extrairDadosCreditas([semCet, p2])).toThrow(/Custo Efetivo Total \(%\)/);
  });

  test("coluna faltando em uma linha é erro", () => {
    const [p1, p2] = paginasFicticias();
    const idx = p1.findIndex((w) => w.texto.startsWith("R$") && Math.abs(w.y - 336.8) < 1);
    const sem = p1.filter((_, i) => i !== idx);
    expect(() => extrairDadosCreditas([sem, p2])).toThrow(/Primeira parcela/);
  });

  test("evolução com número de colunas diferente do de bancos é erro", () => {
    const [p1, p2] = paginasFicticias();
    const idx = p2.findIndex((w) => w.texto.startsWith("R$") && Math.abs(w.y - 127.8) < 1);
    expect(() => extrairDadosCreditas([p1, p2.filter((_, i) => i !== idx)])).toThrow(/evolução/);
  });

  test("sem tabela de evolução é erro", () => {
    const [p1] = paginasFicticias();
    expect(() => extrairDadosCreditas([p1, []])).toThrow(/evolução/);
  });
});
