import { describe, expect, test } from "vitest";
import {
  mascaraCep,
  mascaraCpf,
  mascaraMoeda,
  mascaraNum,
  mascaraNumDec,
  mascaraTelefone,
  mascaraUf,
} from "@/lib/mascaras";

describe("mascaraMoeda", () => {
  test("entrada vazia devolve string vazia", () => {
    expect(mascaraMoeda("")).toBe("");
  });

  test("formatação parcial com poucos dígitos", () => {
    expect(mascaraMoeda("800")).toBe("R$ 800");
  });

  test("formatação parcial com 7 dígitos ganha separador de milhar", () => {
    expect(mascaraMoeda("8000000")).toBe("R$ 8.000.000");
  });

  test("valor completo formatado", () => {
    expect(mascaraMoeda("640000")).toBe("R$ 640.000");
  });

  test("trunca em 12 dígitos", () => {
    expect(mascaraMoeda("1234567890123")).toBe("R$ 123.456.789.012");
  });

  test("reconstrói a partir dos dígitos de um valor já mascarado", () => {
    expect(mascaraMoeda("R$ 800.000")).toBe(mascaraMoeda("800000"));
    expect(mascaraMoeda("R$ 800.000")).toBe("R$ 800.000");
  });
});

describe("mascaraTelefone", () => {
  test("entrada vazia devolve string vazia", () => {
    expect(mascaraTelefone("")).toBe("");
  });

  test("formatação parcial com 3 dígitos", () => {
    expect(mascaraTelefone("199")).toBe("(19) 9");
  });

  test("formatação parcial com 7 dígitos", () => {
    expect(mascaraTelefone("1999999")).toBe("(19) 99999");
  });

  test("celular completo com 11 dígitos", () => {
    expect(mascaraTelefone("19997834187")).toBe("(19) 99783-4187");
  });

  test("trunca em 11 dígitos", () => {
    expect(mascaraTelefone("199978341870")).toBe("(19) 99783-4187");
  });

  test("reconstrói a partir dos dígitos de um valor já mascarado", () => {
    expect(mascaraTelefone("(19) 99783-4187")).toBe(mascaraTelefone("19997834187"));
    expect(mascaraTelefone("(19) 99783-4187")).toBe("(19) 99783-4187");
  });
});

describe("mascaraCpf", () => {
  test("entrada vazia devolve string vazia", () => {
    expect(mascaraCpf("")).toBe("");
  });

  test("formatação parcial com 3 dígitos ainda sem separador", () => {
    expect(mascaraCpf("529")).toBe("529");
  });

  test("formatação parcial com 7 dígitos", () => {
    expect(mascaraCpf("5299822")).toBe("529.982.2");
  });

  test("CPF completo com 11 dígitos", () => {
    expect(mascaraCpf("52998224725")).toBe("529.982.247-25");
  });

  test("trunca em 11 dígitos", () => {
    expect(mascaraCpf("529982247253")).toBe("529.982.247-25");
  });

  test("reconstrói a partir dos dígitos de um valor já mascarado", () => {
    expect(mascaraCpf("529.982.247-25")).toBe(mascaraCpf("52998224725"));
    expect(mascaraCpf("529.982.247-25")).toBe("529.982.247-25");
  });
});

describe("mascaraCep", () => {
  test("entrada vazia devolve string vazia", () => {
    expect(mascaraCep("")).toBe("");
  });

  test("formatação parcial com 3 dígitos ainda sem hífen", () => {
    expect(mascaraCep("013")).toBe("013");
  });

  test("formatação parcial com 7 dígitos", () => {
    expect(mascaraCep("0135400")).toBe("01354-00");
  });

  test("CEP completo com 8 dígitos", () => {
    expect(mascaraCep("01354000")).toBe("01354-000");
  });

  test("trunca em 8 dígitos", () => {
    expect(mascaraCep("013540001")).toBe("01354-000");
  });

  test("reconstrói a partir dos dígitos de um valor já mascarado", () => {
    expect(mascaraCep("01354-000")).toBe(mascaraCep("01354000"));
    expect(mascaraCep("01354-000")).toBe("01354-000");
  });
});

describe("mascaraNum", () => {
  test("entrada vazia devolve string vazia", () => {
    expect(mascaraNum("")).toBe("");
  });

  test("descarta tudo que não é dígito", () => {
    expect(mascaraNum("abc123def456")).toBe("123456");
  });

  test("reconstrói a partir dos dígitos de um valor já mascarado (idempotente)", () => {
    expect(mascaraNum("123456")).toBe(mascaraNum("123456"));
    expect(mascaraNum("123456")).toBe("123456");
  });
});

describe("mascaraNumDec", () => {
  test("entrada vazia devolve string vazia", () => {
    expect(mascaraNumDec("")).toBe("");
  });

  test("mantém dígitos, ponto e vírgula, descarta o resto", () => {
    expect(mascaraNumDec("abc1.234,56def")).toBe("1.234,56");
  });

  test("reconstrói a partir de um valor já mascarado (idempotente)", () => {
    expect(mascaraNumDec("1.234,56")).toBe(mascaraNumDec("1.234,56"));
    expect(mascaraNumDec("1.234,56")).toBe("1.234,56");
  });
});

describe("mascaraUf", () => {
  test("entrada vazia devolve string vazia", () => {
    expect(mascaraUf("")).toBe("");
  });

  test("formatação parcial com 1 letra, maiúscula", () => {
    expect(mascaraUf("s")).toBe("S");
  });

  test("trunca em 2 letras e descarta dígitos", () => {
    expect(mascaraUf("sp1")).toBe("SP");
  });

  test("reconstrói a partir de um valor já mascarado", () => {
    expect(mascaraUf("SP")).toBe(mascaraUf("sp"));
    expect(mascaraUf("SP")).toBe("SP");
  });
});
