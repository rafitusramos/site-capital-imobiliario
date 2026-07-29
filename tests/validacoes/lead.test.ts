import { describe, expect, test } from "vitest";
import {
  leadFinanciamentoSchema,
  leadHomeEquitySchema,
  leadImovelSchema,
  schemaPorTipo,
} from "@/lib/validations/lead";

function baseFinanciamento() {
  return {
    nome: "Maria Silva",
    email: "maria@example.com",
    telefone: "(19) 99783-4187",
    renda: 8000,
    tipoRemuneracao: "Assalariado" as const,
    entradaDisponivel: 100000,
    usaFgts: true,
    valorImovel: 500000,
    momentoCompra: "Já escolhi o imóvel" as const,
    tipoImovel: "Apartamento" as const,
    cidade: "Vinhedo",
    estado: "sp",
    percentualEntrada: 20,
    valorCredito: 400000,
    prazoMeses: 360,
    parcelaEstimada: 4000,
  };
}

function baseHomeEquity() {
  return {
    nome: "João Souza",
    email: "joao@example.com",
    telefone: "(19) 99783-4187",
    renda: 10000,
    tipoRemuneracao: "Assalariado" as const,
    objetivoCredito: "Investir no meu negócio" as const,
    tipoImovel: "Casa" as const,
    cep: "13280-000",
    numero: "123",
    areaM2: 120,
    valorImovel: 600000,
    imovelQuitado: true,
    valorCreditoEstimado: 300000,
    prazoMeses: 180,
    parcelaEstimada: 3000,
  };
}

function baseImovel() {
  return {
    nome: "Ana Costa",
    email: "ana@example.com",
    telefone: "(19) 99783-4187",
  };
}

describe("campos comuns (nome, email, telefone, cpf)", () => {
  test("nome com menos de 3 caracteres reprova", () => {
    const parsed = leadFinanciamentoSchema.safeParse({ ...baseFinanciamento(), nome: "Jo" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe seu nome completo.");
    }
  });

  test("e-mail inválido reprova", () => {
    const parsed = leadFinanciamentoSchema.safeParse({
      ...baseFinanciamento(),
      email: "não-é-email",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe um e-mail válido.");
    }
  });

  test("telefone é normalizado para só dígitos no parsed.data", () => {
    const parsed = leadFinanciamentoSchema.safeParse({
      ...baseFinanciamento(),
      telefone: "(19) 99783-4187",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.telefone).toBe("19997834187");
    }
  });

  test("telefone inválido reprova com mensagem específica", () => {
    const parsed = leadFinanciamentoSchema.safeParse({
      ...baseFinanciamento(),
      telefone: "123",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe um telefone válido com DDD.");
    }
  });

  test("CPF ausente é aceito e vira undefined", () => {
    const { ...dados } = baseFinanciamento();
    const parsed = leadFinanciamentoSchema.safeParse(dados);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cpf).toBeUndefined();
    }
  });

  test("CPF válido mascarado vira só dígitos", () => {
    const parsed = leadFinanciamentoSchema.safeParse({
      ...baseFinanciamento(),
      cpf: "529.982.247-25",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cpf).toBe("52998224725");
    }
  });

  test("CPF inválido reprova", () => {
    const parsed = leadFinanciamentoSchema.safeParse({
      ...baseFinanciamento(),
      cpf: "111.111.111-11",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe um CPF válido.");
    }
  });
});

describe("leadFinanciamentoSchema", () => {
  test("dados válidos passam", () => {
    const parsed = leadFinanciamentoSchema.safeParse(baseFinanciamento());
    expect(parsed.success).toBe(true);
  });

  test("estado é transformado para maiúsculas", () => {
    const parsed = leadFinanciamentoSchema.safeParse({ ...baseFinanciamento(), estado: "sp" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.estado).toBe("SP");
    }
  });

  test("estado com tamanho diferente de 2 reprova", () => {
    const parsed = leadFinanciamentoSchema.safeParse({ ...baseFinanciamento(), estado: "são paulo" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe a UF (2 letras).");
    }
  });

  test("prazoMeses aceita os limites 120 e 420", () => {
    expect(leadFinanciamentoSchema.safeParse({ ...baseFinanciamento(), prazoMeses: 120 }).success).toBe(
      true,
    );
    expect(leadFinanciamentoSchema.safeParse({ ...baseFinanciamento(), prazoMeses: 420 }).success).toBe(
      true,
    );
  });

  test("prazoMeses reprova fora dos limites 120-420", () => {
    expect(leadFinanciamentoSchema.safeParse({ ...baseFinanciamento(), prazoMeses: 119 }).success).toBe(
      false,
    );
    expect(leadFinanciamentoSchema.safeParse({ ...baseFinanciamento(), prazoMeses: 421 }).success).toBe(
      false,
    );
  });

  test("tipoImovel fora do enum reprova", () => {
    const parsed = leadFinanciamentoSchema.safeParse({
      ...baseFinanciamento(),
      tipoImovel: "Cobertura",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["tipoImovel"]);
    }
  });
});

describe("leadHomeEquitySchema", () => {
  test("dados válidos passam", () => {
    const parsed = leadHomeEquitySchema.safeParse(baseHomeEquity());
    expect(parsed.success).toBe(true);
  });

  test("prazoMeses aceita os limites 60 e 240", () => {
    expect(leadHomeEquitySchema.safeParse({ ...baseHomeEquity(), prazoMeses: 60 }).success).toBe(true);
    expect(leadHomeEquitySchema.safeParse({ ...baseHomeEquity(), prazoMeses: 240 }).success).toBe(true);
  });

  test("prazoMeses reprova fora dos limites 60-240", () => {
    expect(leadHomeEquitySchema.safeParse({ ...baseHomeEquity(), prazoMeses: 59 }).success).toBe(false);
    expect(leadHomeEquitySchema.safeParse({ ...baseHomeEquity(), prazoMeses: 241 }).success).toBe(false);
  });

  test("CEP é normalizado para 8 dígitos", () => {
    const parsed = leadHomeEquitySchema.safeParse({ ...baseHomeEquity(), cep: "13280-000" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cep).toBe("13280000");
    }
  });

  test("CEP com tamanho errado reprova", () => {
    const parsed = leadHomeEquitySchema.safeParse({ ...baseHomeEquity(), cep: "1328000" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("CEP inválido.");
    }
  });

  test("objetivoCredito fora do enum reprova", () => {
    const parsed = leadHomeEquitySchema.safeParse({
      ...baseHomeEquity(),
      objetivoCredito: "Comprar um carro",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["objetivoCredito"]);
    }
  });

  describe("superRefine do imóvel quitado", () => {
    test("imovelQuitado false sem saldoDevedor reprova com issue em saldoDevedor", () => {
      const { saldoDevedor: _semSaldo, ...semSaldoDevedor } = {
        ...baseHomeEquity(),
        imovelQuitado: false,
        saldoDevedor: undefined,
      };
      const parsed = leadHomeEquitySchema.safeParse(semSaldoDevedor);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].path).toEqual(["saldoDevedor"]);
        expect(parsed.error.issues[0].message).toBe("Informe o saldo devedor.");
      }
    });

    test("imovelQuitado false com saldoDevedor presente aprova", () => {
      const parsed = leadHomeEquitySchema.safeParse({
        ...baseHomeEquity(),
        imovelQuitado: false,
        saldoDevedor: 150000,
      });
      expect(parsed.success).toBe(true);
    });

    test("imovelQuitado true sem saldoDevedor aprova", () => {
      const parsed = leadHomeEquitySchema.safeParse({
        ...baseHomeEquity(),
        imovelQuitado: true,
      });
      expect(parsed.success).toBe(true);
    });
  });
});

describe("leadImovelSchema", () => {
  test("aceita só os campos comuns, com todos os extras opcionais", () => {
    const parsed = leadImovelSchema.safeParse(baseImovel());
    expect(parsed.success).toBe(true);
  });

  test("imovelId que não é UUID reprova", () => {
    const parsed = leadImovelSchema.safeParse({ ...baseImovel(), imovelId: "não-é-um-uuid" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["imovelId"]);
    }
  });

  test("formaPagamento fora do enum reprova", () => {
    const parsed = leadImovelSchema.safeParse({ ...baseImovel(), formaPagamento: "pix" });
    expect(parsed.success).toBe(false);
  });
});

describe("schemaPorTipo", () => {
  test("mapeia cada tipo para o schema correspondente", () => {
    expect(schemaPorTipo.financiamento).toBe(leadFinanciamentoSchema);
    expect(schemaPorTipo["home-equity"]).toBe(leadHomeEquitySchema);
    expect(schemaPorTipo.imoveis).toBe(leadImovelSchema);
  });

  test("cada schema do mapa valida seus próprios dados", () => {
    expect(schemaPorTipo.financiamento.safeParse(baseFinanciamento()).success).toBe(true);
    expect(schemaPorTipo["home-equity"].safeParse(baseHomeEquity()).success).toBe(true);
    expect(schemaPorTipo.imoveis.safeParse(baseImovel()).success).toBe(true);
  });
});
