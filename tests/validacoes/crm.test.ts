import { describe, expect, test } from "vitest";
import {
  atribuirResponsavelSchema,
  criarLeadConsorcioSchema,
  criarLeadFinanciamentoSchema,
  criarLeadHomeEquitySchema,
  criarLeadImovelSchema,
  definirTagsSchema,
  lembreteNovoSchema,
  lembreteReagendarSchema,
  leadComumSchema,
  novaInteracaoSchema,
  schemaAtualizarLeadPorTipo,
  schemaCriarLeadPorTipo,
  schemaMoverLead,
  valorMonetarioSchema,
} from "@/lib/validations/crm";

function baseComum() {
  return {
    nome: "Maria Silva",
    email: "maria@example.com",
    telefone: "(19) 99783-4187",
  };
}

describe("leadComumSchema", () => {
  test("aceita só os campos obrigatórios", () => {
    expect(leadComumSchema.safeParse(baseComum()).success).toBe(true);
  });

  test("nome curto reprova", () => {
    const parsed = leadComumSchema.safeParse({ ...baseComum(), nome: "Jo" });
    expect(parsed.success).toBe(false);
  });

  test("telefone é normalizado para só dígitos", () => {
    const parsed = leadComumSchema.safeParse(baseComum());
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.telefone).toBe("19997834187");
  });

  test("cpf mascarado vira só dígitos e valida dígito verificador", () => {
    const valido = leadComumSchema.safeParse({ ...baseComum(), cpf: "529.982.247-25" });
    expect(valido.success).toBe(true);
    if (valido.success) expect(valido.data.cpf).toBe("52998224725");

    const invalido = leadComumSchema.safeParse({ ...baseComum(), cpf: "111.111.111-11" });
    expect(invalido.success).toBe(false);
  });

  test("corretorId nulo é aceito (lead sem responsável)", () => {
    expect(leadComumSchema.safeParse({ ...baseComum(), corretorId: null }).success).toBe(true);
  });
});

describe("valorMonetarioSchema", () => {
  test("aceita zero e valores com duas casas decimais", () => {
    expect(valorMonetarioSchema.safeParse(0).success).toBe(true);
    expect(valorMonetarioSchema.safeParse(500_000.5).success).toBe(true);
    expect(valorMonetarioSchema.safeParse(19.9).success).toBe(true);
  });

  test("reprova negativo", () => {
    expect(valorMonetarioSchema.safeParse(-1).success).toBe(false);
  });

  test("reprova acima do teto de 999.999.999,99", () => {
    expect(valorMonetarioSchema.safeParse(1_000_000_000).success).toBe(false);
  });

  test("reprova mais de duas casas decimais", () => {
    expect(valorMonetarioSchema.safeParse(100.999).success).toBe(false);
  });
});

describe("criarLeadFinanciamentoSchema", () => {
  test("comum sozinho já é válido (todo campo de origem é opcional)", () => {
    expect(criarLeadFinanciamentoSchema.safeParse(baseComum()).success).toBe(true);
  });

  test("aceita os campos de origem quando presentes", () => {
    const parsed = criarLeadFinanciamentoSchema.safeParse({
      ...baseComum(),
      valorImovel: 500_000,
      valorCredito: 400_000,
      prazoMeses: 360,
      estado: "sp",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.estado).toBe("SP");
  });

  test("prazoMeses fora de 1-420 reprova", () => {
    expect(criarLeadFinanciamentoSchema.safeParse({ ...baseComum(), prazoMeses: 0 }).success).toBe(false);
    expect(criarLeadFinanciamentoSchema.safeParse({ ...baseComum(), prazoMeses: 421 }).success).toBe(false);
  });
});

describe("criarLeadHomeEquitySchema", () => {
  test("cep é normalizado para 8 dígitos", () => {
    const parsed = criarLeadHomeEquitySchema.safeParse({ ...baseComum(), cep: "13280-000" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.cep).toBe("13280000");
  });

  test("cep com tamanho errado reprova", () => {
    expect(criarLeadHomeEquitySchema.safeParse({ ...baseComum(), cep: "123" }).success).toBe(false);
  });

  test("situacaoImovel fora do enum reprova", () => {
    expect(
      criarLeadHomeEquitySchema.safeParse({ ...baseComum(), situacaoImovel: "alugado" }).success,
    ).toBe(false);
  });

  test("valorCreditoDesejado e valorCreditoEstimado convivem (campos distintos)", () => {
    const parsed = criarLeadHomeEquitySchema.safeParse({
      ...baseComum(),
      valorCreditoDesejado: 250_000,
      valorCreditoEstimado: 300_000,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.valorCreditoDesejado).toBe(250_000);
      expect(parsed.data.valorCreditoEstimado).toBe(300_000);
    }
  });
});

describe("criarLeadImovelSchema", () => {
  test("imovelId precisa ser uuid quando presente", () => {
    expect(criarLeadImovelSchema.safeParse({ ...baseComum(), imovelId: "não-é-uuid" }).success).toBe(false);
  });

  test("dormitoriosMin fora de 0-20 reprova", () => {
    expect(criarLeadImovelSchema.safeParse({ ...baseComum(), dormitoriosMin: -1 }).success).toBe(false);
    expect(criarLeadImovelSchema.safeParse({ ...baseComum(), dormitoriosMin: 21 }).success).toBe(false);
    expect(criarLeadImovelSchema.safeParse({ ...baseComum(), dormitoriosMin: 20 }).success).toBe(true);
  });
});

describe("criarLeadConsorcioSchema", () => {
  test("nenhum campo de origem é somenteLeitura: comum + tudo opcional passa", () => {
    const parsed = criarLeadConsorcioSchema.safeParse({
      ...baseComum(),
      valorCarta: 100_000,
      segmento: "veiculo",
      contemplacao: "em-lance",
    });
    expect(parsed.success).toBe(true);
  });

  test("segmento fora do enum reprova", () => {
    expect(criarLeadConsorcioSchema.safeParse({ ...baseComum(), segmento: "eletronico" }).success).toBe(false);
  });
});

describe("schemaCriarLeadPorTipo / schemaAtualizarLeadPorTipo", () => {
  test("mapeiam os 4 tipos de lead", () => {
    expect(Object.keys(schemaCriarLeadPorTipo).sort()).toEqual(
      ["financiamento", "home-equity", "imoveis", "consorcio"].sort(),
    );
    expect(Object.keys(schemaAtualizarLeadPorTipo).sort()).toEqual(
      ["financiamento", "home-equity", "imoveis", "consorcio"].sort(),
    );
  });

  test("atualizar aceita objeto vazio (partial) — comum também fica opcional", () => {
    expect(schemaAtualizarLeadPorTipo.financiamento.safeParse({}).success).toBe(true);
    expect(schemaAtualizarLeadPorTipo["home-equity"].safeParse({ cep: "13280-000" }).success).toBe(true);
  });
});

describe("schemaMoverLead — motivo obrigatório", () => {
  test("mover para etapa que não exige motivo passa sem motivo", () => {
    const schema = schemaMoverLead("financiamento");
    const parsed = schema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      etapa: "simulacao",
    });
    expect(parsed.success).toBe(true);
  });

  test("mover para 'perdido' sem motivo reprova", () => {
    const schema = schemaMoverLead("financiamento");
    const parsed = schema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      etapa: "perdido",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("motivo"))).toBe(true);
    }
  });

  test("mover para 'perdido' com motivo passa", () => {
    const schema = schemaMoverLead("financiamento");
    const parsed = schema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      etapa: "perdido",
      motivo: "preco",
    });
    expect(parsed.success).toBe(true);
  });

  test("motivo 'outro' exige motivoObs com pelo menos 5 caracteres", () => {
    const schema = schemaMoverLead("financiamento");
    const semObs = schema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      etapa: "perdido",
      motivo: "outro",
      motivoObs: "ok",
    });
    expect(semObs.success).toBe(false);

    const comObs = schema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      etapa: "perdido",
      motivo: "outro",
      motivoObs: "cliente desistiu da compra",
    });
    expect(comObs.success).toBe(true);
  });

  test("etapa que não pertence ao pipeline do tipo reprova", () => {
    // 'apresentacao' é etapa de consórcio, não de financiamento.
    const schema = schemaMoverLead("financiamento");
    const parsed = schema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      etapa: "apresentacao",
    });
    expect(parsed.success).toBe(false);
  });

  test("'nao-qualificado' exige motivo em imóveis", () => {
    const schema = schemaMoverLead("imoveis");
    expect(
      schema.safeParse({
        leadId: "550e8400-e29b-41d4-a716-446655440000",
        etapa: "nao-qualificado",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        leadId: "550e8400-e29b-41d4-a716-446655440000",
        etapa: "nao-qualificado",
        motivo: "sem-interesse",
      }).success,
    ).toBe(true);
  });
});

describe("novaInteracaoSchema", () => {
  const leadId = "550e8400-e29b-41d4-a716-446655440000";

  test("interação simples sem lembrete passa", () => {
    expect(
      novaInteracaoSchema.safeParse({ leadId, tipo: "ligacao", conteudo: "Cliente confirmou interesse." })
        .success,
    ).toBe(true);
  });

  test("'sistema' não é uma opção de criação manual", () => {
    expect(novaInteracaoSchema.safeParse({ leadId, tipo: "sistema", conteudo: "x" }).success).toBe(false);
  });

  test("conteudo vazio reprova", () => {
    expect(novaInteracaoSchema.safeParse({ leadId, tipo: "nota", conteudo: "" }).success).toBe(false);
  });

  test("conteudo acima de 5000 caracteres reprova", () => {
    expect(
      novaInteracaoSchema.safeParse({ leadId, tipo: "nota", conteudo: "a".repeat(5001) }).success,
    ).toBe(false);
  });

  test("com lembrete válido (futuro) passa", () => {
    const futuro = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      novaInteracaoSchema.safeParse({
        leadId,
        tipo: "whatsapp",
        conteudo: "Enviado material.",
        lembrete: { agendadoPara: futuro, descricao: "Ligar de volta" },
      }).success,
    ).toBe(true);
  });

  test("lembrete no passado reprova na criação", () => {
    const passado = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      novaInteracaoSchema.safeParse({
        leadId,
        tipo: "whatsapp",
        conteudo: "Enviado material.",
        lembrete: { agendadoPara: passado, descricao: "Ligar de volta" },
      }).success,
    ).toBe(false);
  });

  test("lembrete com descrição curta demais reprova", () => {
    const futuro = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      lembreteNovoSchema.safeParse({ agendadoPara: futuro, descricao: "oi" }).success,
    ).toBe(false);
  });
});

describe("lembreteReagendarSchema", () => {
  test("aceita data no passado (reagendar permite, ao contrário da criação)", () => {
    const passado = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      lembreteReagendarSchema.safeParse({
        lembreteId: "550e8400-e29b-41d4-a716-446655440000",
        agendadoPara: passado,
      }).success,
    ).toBe(true);
  });
});

describe("definirTagsSchema", () => {
  const leadId = "550e8400-e29b-41d4-a716-446655440000";

  test("até 8 tags passa", () => {
    expect(definirTagsSchema.safeParse({ leadId, tags: Array(8).fill("tag") }).success).toBe(true);
  });

  test("mais de 8 tags reprova", () => {
    expect(definirTagsSchema.safeParse({ leadId, tags: Array(9).fill("tag") }).success).toBe(false);
  });

  test("lista vazia é permitida (remover todas as tags)", () => {
    expect(definirTagsSchema.safeParse({ leadId, tags: [] }).success).toBe(true);
  });
});

describe("atribuirResponsavelSchema", () => {
  const leadId = "550e8400-e29b-41d4-a716-446655440000";

  test("corretorId nulo é aceito (largar o lead)", () => {
    expect(atribuirResponsavelSchema.safeParse({ leadId, corretorId: null }).success).toBe(true);
  });

  test("corretorId precisa ser uuid quando não é nulo", () => {
    expect(atribuirResponsavelSchema.safeParse({ leadId, corretorId: "não-é-uuid" }).success).toBe(false);
  });
});
