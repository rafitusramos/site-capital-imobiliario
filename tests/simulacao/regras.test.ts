import { describe, expect, test } from "vitest";
import { CONFIG_SIMULACAO } from "@/lib/simulacao/config";
import { montarSimulacao } from "@/lib/simulacao/regras";
import type { BancoCreditas, DadosCreditas } from "@/lib/simulacao/tipos";

function banco(nome: string, o: Partial<BancoCreditas> = {}): BancoCreditas {
  return {
    nome, taxa: 12, cet: 13, custo_total: 800000, prazo: 420, indexador: "TR", sistema: "SAC",
    primeira: 3000, ultima: 650, parcelas: [3000, 2900], logo: null, ...o,
  };
}
function dados(bancos: BancoCreditas[]): DadosCreditas {
  return { data: "06/11/2026", valor_imovel: 400000, valor_financiamento: 260000, renda_media: 9000, meses: [1, 12], bancos };
}
const opc = { cliente: "Maria Teste", referencia: "RT-2026-0001" };

describe("montarSimulacao", () => {
  test("só compara o indexador TR; IPCA vai por último, fora do comparativo", () => {
    const vm = montarSimulacao(
      dados([banco("A", { indexador: "IPCA", cet: 9 }), banco("B", { cet: 13 }), banco("C", { cet: 12 })]),
      CONFIG_SIMULACAO, opc,
    );
    expect(vm.bancos.map((b) => b.nome)).toEqual(["B", "C", "A"]);
    expect(vm.melhor.nome).toBe("C");
    expect(vm.bancos[2]).toMatchObject({ comparavel: false, cls: "ip", ast: "*" });
    expect(vm.fora.map((b) => b.nome)).toEqual(["A"]);
    expect(vm.foraIdx).toBe("IPCA");
  });

  test("Volpi é excluído, qualquer caixa", () => {
    const vm = montarSimulacao(dados([banco("VOLPI", { cet: 1 }), banco("B")]), CONFIG_SIMULACAO, opc);
    expect(vm.bancos.map((b) => b.nome)).toEqual(["B"]);
  });

  test("'Brasil' vira 'Banco do Brasil'", () => {
    const vm = montarSimulacao(dados([banco("Brasil")]), CONFIG_SIMULACAO, opc);
    expect(vm.bancos[0].nome).toBe("Banco do Brasil");
  });

  test("melhor = menor CET; pior = maior custo total; economia é a diferença", () => {
    const vm = montarSimulacao(
      dados([banco("A", { cet: 14, custo_total: 900000 }), banco("B", { cet: 12, custo_total: 700000 }), banco("C", { cet: 13, custo_total: 950000 })]),
      CONFIG_SIMULACAO, opc,
    );
    expect(vm.melhor.nome).toBe("B");
    expect(vm.melhor.cls).toBe("best");
    expect(vm.pior.nome).toBe("C");
    expect(vm.economia).toBe(250000);
  });

  test("renda mínima = 1ª parcela / 30%", () => {
    const vm = montarSimulacao(dados([banco("A", { primeira: 3000 })]), CONFIG_SIMULACAO, opc);
    expect(vm.rendaMinima).toBeCloseTo(10000, 6);
    expect(vm.comprometimentoPct).toBe(30);
  });

  test("sem banco em TR, compara todos", () => {
    const vm = montarSimulacao(dados([banco("A", { indexador: "IPCA", cet: 9 }), banco("B", { indexador: "IPCA", cet: 8 })]), CONFIG_SIMULACAO, opc);
    expect(vm.melhor.nome).toBe("B");
    expect(vm.fora).toEqual([]);
  });

  test("só bancos excluídos é erro", () => {
    expect(() => montarSimulacao(dados([banco("Volpi")]), CONFIG_SIMULACAO, opc)).toThrow(/banco/i);
  });

  test("entrada, saudação, etapas e referência", () => {
    const vm = montarSimulacao(dados([banco("A")]), CONFIG_SIMULACAO, opc);
    expect(vm.entrada).toBe(140000);
    expect(vm.entradaPct).toBe(35);
    expect(vm.saudacao).toBe("Olá, Maria Teste. Sua simulação está pronta.");
    expect(vm.referencia).toBe("RT-2026-0001");
    expect(vm.etapas).toHaveLength(6);
    expect(vm.etapas.map((e) => e.cls)).toEqual(["now", "", "", "", "", ""]);
    expect(vm.etapas[0].tag).toBe("Você está aqui");
    expect(vm.etapas[1].tag).toBe("Próximo passo");
  });

  test("parcela nula (contrato encerrado) fica nula na evolução", () => {
    const vm = montarSimulacao(dados([banco("A", { parcelas: [3000, null] })]), CONFIG_SIMULACAO, opc);
    expect(vm.evolucao[1].celulas[0].valor).toBeNull();
  });

  test("tem_price só quando algum banco é Price", () => {
    expect(montarSimulacao(dados([banco("A")]), CONFIG_SIMULACAO, opc).temPrice).toBe(false);
    expect(montarSimulacao(dados([banco("A", { sistema: "Price" })]), CONFIG_SIMULACAO, opc).temPrice).toBe(true);
  });

  test("não altera os dados de entrada", () => {
    const d = dados([banco("Brasil")]);
    montarSimulacao(d, CONFIG_SIMULACAO, opc);
    expect(d.bancos[0].nome).toBe("Brasil");
  });
});
