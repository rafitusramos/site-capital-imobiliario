import { describe, expect, test } from "vitest";
import {
  booleanoParaCampo,
  campoParaBooleano,
  chaveParaCamel,
  moedaParaNumero,
  numeroParaInteiro,
  percentualParaNumero,
  textoEditavelParaValor,
  valorParaExibicao,
  valorParaTextoEditavel,
} from "@/components/admin/crm/conversorCampo";
import type { CampoCRM } from "@/lib/crm/campos";

// Tabela cruzada com as chaves reais de lib/crm/campos.ts e o nome camelCase
// que lib/validations/crm.ts espera para o mesmo campo — se alguém editar
// `chaveParaCamel` e uma dessas parar de bater, o payload de atualizarLead/
// criarLead perde o campo em silêncio (o Zod só vê a chave errada como
// omitida, nunca lança erro).
describe("chaveParaCamel — mesma tabela de lib/crm/campos.ts x lib/validations/crm.ts", () => {
  test.each([
    ["valor_imovel", "valorImovel"],
    ["percentual_entrada", "percentualEntrada"],
    ["valor_credito_desejado", "valorCreditoDesejado"],
    ["situacao_imovel", "situacaoImovel"],
    ["ja_possui_consorcio", "jaPossuiConsorcio"],
    ["ja_tem_aprovacao", "jaTemAprovacao"],
    ["imovel_desejado", "imovelDesejado"],
    ["orcamento_max", "orcamentoMax"],
    ["cidade_preferida", "cidadePreferida"],
    ["dormitorios_min", "dormitoriosMin"],
    ["area_m2", "areaM2"],
    ["banco_simulado", "bancoSimulado"],
    ["primeiro_imovel", "primeiroImovel"],
    ["tipo_remuneracao", "tipoRemuneracao"],
    ["momento_compra", "momentoCompra"],
    ["cep", "cep"],
    ["grupo", "grupo"],
    ["contemplacao", "contemplacao"],
  ])("%s -> %s", (snake, camel) => {
    expect(chaveParaCamel(snake)).toBe(camel);
  });
});

describe("moedaParaNumero — reais inteiros, sem centavos (convenção de ImovelEditor.tsx)", () => {
  test("string vazia vira undefined, nunca 0", () => {
    expect(moedaParaNumero("")).toBeUndefined();
  });
  test("extrai só os dígitos, ignorando a máscara", () => {
    expect(moedaParaNumero("R$ 445.000")).toBe(445000);
  });
});

describe("percentualParaNumero — escala 0-100, não fração (diferente de lib/parametros/taxa.ts)", () => {
  test("20 continua 20, não 0.2", () => {
    expect(percentualParaNumero("20")).toBe(20);
  });
  test("aceita vírgula decimal pt-BR", () => {
    expect(percentualParaNumero("17,5")).toBe(17.5);
  });
  test("vazio vira undefined", () => {
    expect(percentualParaNumero("  ")).toBeUndefined();
  });
});

describe("numeroParaInteiro", () => {
  test("vazio vira undefined", () => {
    expect(numeroParaInteiro("")).toBeUndefined();
  });
  test("descarta não-dígitos", () => {
    expect(numeroParaInteiro("12 meses")).toBe(12);
  });
});

describe("booleano tri-state <-> banco", () => {
  test("ida e volta preserva os três estados", () => {
    expect(booleanoParaCampo(true)).toBe("sim");
    expect(booleanoParaCampo(false)).toBe("nao");
    expect(booleanoParaCampo(null)).toBe("");
    expect(campoParaBooleano("sim")).toBe(true);
    expect(campoParaBooleano("nao")).toBe(false);
    expect(campoParaBooleano("")).toBeUndefined();
  });
});

describe("textoEditavelParaValor — nunca devolve null (schemas são .optional(), não .nullable())", () => {
  test.each([
    ["moeda", ""],
    ["numero", ""],
    ["percentual", ""],
    ["booleano", ""],
    ["texto", ""],
    ["textarea", "   "],
  ] as const)("tipo=%s, texto=%j -> undefined", (tipo, texto) => {
    expect(textoEditavelParaValor(tipo, texto)).toBeUndefined();
  });

  test("texto/select/textarea faz trim", () => {
    expect(textoEditavelParaValor("texto", "  Banco X  ")).toBe("Banco X");
  });
});

describe("valorParaTextoEditavel", () => {
  test("moeda: number do banco vira string mascarada", () => {
    expect(valorParaTextoEditavel("moeda", 445000)).toBe("R$ 445.000");
  });
  test("null/undefined viram string vazia (exceto booleano, que vira '')", () => {
    expect(valorParaTextoEditavel("texto", null)).toBe("");
    expect(valorParaTextoEditavel("booleano", null)).toBe("");
  });
});

describe("valorParaExibicao", () => {
  const campoSelect: CampoCRM = {
    chave: "situacao_imovel",
    label: "Situação do imóvel",
    tipo: "select",
    fonte: "coluna",
    opcoes: [{ valor: "quitado", label: "Quitado" }],
  };

  test("select resolve o label da opção, não o slug bruto", () => {
    expect(valorParaExibicao(campoSelect, "quitado")).toBe("Quitado");
  });

  test("nulo/vazio sempre mostra travessão", () => {
    expect(valorParaExibicao(campoSelect, null)).toBe("—");
    expect(valorParaExibicao(campoSelect, "")).toBe("—");
  });

  test("percentual mostra escala 0-100 com '%', não fração", () => {
    const campoPercentual: CampoCRM = { chave: "x", label: "X", tipo: "percentual", fonte: "coluna" };
    expect(valorParaExibicao(campoPercentual, 17.5)).toBe("17,5%");
  });

  test("booleano mostra Sim/Não", () => {
    const campoBooleano: CampoCRM = { chave: "x", label: "X", tipo: "booleano", fonte: "coluna" };
    expect(valorParaExibicao(campoBooleano, true)).toBe("Sim");
    expect(valorParaExibicao(campoBooleano, false)).toBe("Não");
  });

  // Regressão: "YYYY-MM-DD" é uma data de calendário, não um instante. Rotear
  // isso por `new Date(...)` + `timeZone: "America/Sao_Paulo"` (UTC-3)
  // mostraria o dia ANTERIOR, porque "2026-07-30" vira meia-noite UTC — a
  // mesma classe de armadilha de fuso que lib/crm/lembretes.ts documenta.
  test("data não perde um dia ao formatar (não passa por new Date + timeZone)", () => {
    const campoData: CampoCRM = { chave: "x", label: "X", tipo: "data", fonte: "coluna" };
    expect(valorParaExibicao(campoData, "2026-07-30")).toBe("30/07/2026");
    expect(valorParaExibicao(campoData, "2026-01-01")).toBe("01/01/2026");
  });
});
