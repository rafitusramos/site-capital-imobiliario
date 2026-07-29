import { describe, expect, test } from "vitest";
import {
  diferencialSchema,
  faqSchema,
  imagemSchema,
  imovelFormSchema,
  tipologiaSchema,
} from "@/lib/validations/imovel";

const TIPO_UUID = "123e4567-e89b-12d3-a456-426614174001";
const FASE_UUID = "123e4567-e89b-12d3-a456-426614174002";

/**
 * Todo campo numérico opcional precisa estar PRESENTE no objeto (mesmo que
 * `null`) — ver o describe "bug: campo numérico opcional ausente" abaixo.
 * Por isso a base explicita todos eles em vez de simplesmente omiti-los.
 */
function base() {
  return {
    titulo: "Residencial Jardim das Palmeiras",
    slug: "residencial-jardim-das-palmeiras",
    tipo_id: TIPO_UUID,
    fase_id: FASE_UUID,
    area_min: null,
    area_max: null,
    dormitorios_min: null,
    dormitorios_max: null,
    banheiros_min: null,
    banheiros_max: null,
    vagas_min: null,
    vagas_max: null,
    valor_a_partir_de: null,
  };
}

describe("imovelFormSchema", () => {
  test("base válida passa", () => {
    const parsed = imovelFormSchema.safeParse(base());
    expect(parsed.success).toBe(true);
  });

  test("slug fora do kebab-case reprova", () => {
    const parsed = imovelFormSchema.safeParse({ ...base(), slug: "Jardim_Palmeiras" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe(
        "Use apenas letras minúsculas, números e hífens (kebab-case).",
      );
    }
  });

  test("tipo_id que não é UUID reprova com mensagem específica", () => {
    const parsed = imovelFormSchema.safeParse({ ...base(), tipo_id: "não-é-um-uuid" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Selecione o tipo do imóvel.");
    }
  });

  test("fase_id que não é UUID reprova com mensagem específica", () => {
    const parsed = imovelFormSchema.safeParse({ ...base(), fase_id: "não-é-um-uuid" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Selecione a fase do imóvel.");
    }
  });

  describe("armadilha: campo numérico opcional ausente do objeto", () => {
    // A intenção declarada do schema (o próprio nome "numeroOpcional") é que
    // estes campos sejam OPCIONAIS. Só que
    // `z.union([z.number(), z.nan(), z.literal(""), z.undefined(), z.null()])`
    // só aceita ausência de valor quando a CHAVE existe no objeto (ainda que
    // valendo undefined/null) — com Zod 4.4.3 uma chave inteiramente ausente
    // reprova com "Invalid input: expected nonoptional, received undefined",
    // mesmo a união incluindo z.undefined(). Comportamento diferente do Zod 3.
    //
    // Hoje isso NÃO quebra nada: o único chamador é montarPayloadDados() em
    // components/admin/ImovelEditor.tsx, que sempre explicita todas as chaves
    // (via paraNumeroOuNull, que devolve null). A armadilha é para o próximo
    // chamador — um que monte o objeto a partir de FormData, por exemplo.
    //
    // test.fails() registra a intenção sem deixar a suíte vermelha: se um dia
    // o schema for corrigido para aceitar a chave ausente, ESTE TESTE FICA
    // VERMELHO avisando que o comentário acima e o `.fails` podem cair.
    test.fails("omitir area_min ainda reprova (deveria ser equivalente a null)", () => {
      const { area_min: _omitido, ...semAreaMin } = base();
      const parsed = imovelFormSchema.safeParse(semAreaMin);
      expect(parsed.success).toBe(true);
    });

    test("a mensagem de reprovação da chave ausente é a do Zod, não a do schema", () => {
      const { area_min: _omitido, ...semAreaMin } = base();
      const parsed = imovelFormSchema.safeParse(semAreaMin);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].path).toEqual(["area_min"]);
        expect(parsed.error.issues[0].message).toBe(
          "Invalid input: expected nonoptional, received undefined",
        );
      }
    });
  });

  describe("numeroOpcional", () => {
    test("string vazia vira null", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: "" });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.area_min).toBeNull();
    });

    test("undefined vira null", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: undefined });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.area_min).toBeNull();
    });

    test("null permanece null", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: null });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.area_min).toBeNull();
    });

    test("NaN vira null", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: NaN });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.area_min).toBeNull();
    });

    test("número válido é mantido", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: 68 });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.area_min).toBe(68);
    });
  });

  describe("inteiroOpcional", () => {
    test("decimal reprova com 'Informe um número inteiro.'", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), dormitorios_min: 2.5 });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe("Informe um número inteiro.");
      }
    });

    test("inteiro válido é mantido", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), dormitorios_min: 3 });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.dormitorios_min).toBe(3);
    });
  });

  describe("refinamentos de faixa", () => {
    test("área: máximo menor que o mínimo reprova com issue em area_max", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: 100, area_max: 50 });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].path).toEqual(["area_max"]);
        expect(parsed.error.issues[0].message).toBe(
          "A área máxima não pode ser menor que a mínima.",
        );
      }
    });

    test("área: máximo igual ao mínimo aprova", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: 50, area_max: 50 });
      expect(parsed.success).toBe(true);
    });

    test("área: um dos dois null aprova", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), area_min: null, area_max: 100 });
      expect(parsed.success).toBe(true);
    });

    test("dormitórios: máximo menor que o mínimo reprova com issue em dormitorios_max", () => {
      const parsed = imovelFormSchema.safeParse({
        ...base(),
        dormitorios_min: 3,
        dormitorios_max: 2,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].path).toEqual(["dormitorios_max"]);
        expect(parsed.error.issues[0].message).toBe(
          "O máximo de dormitórios não pode ser menor que o mínimo.",
        );
      }
    });

    test("dormitórios: máximo igual ao mínimo aprova", () => {
      const parsed = imovelFormSchema.safeParse({
        ...base(),
        dormitorios_min: 2,
        dormitorios_max: 2,
      });
      expect(parsed.success).toBe(true);
    });

    test("dormitórios: um dos dois null aprova", () => {
      const parsed = imovelFormSchema.safeParse({
        ...base(),
        dormitorios_min: null,
        dormitorios_max: 3,
      });
      expect(parsed.success).toBe(true);
    });

    test("banheiros: máximo menor que o mínimo reprova com issue em banheiros_max", () => {
      const parsed = imovelFormSchema.safeParse({
        ...base(),
        banheiros_min: 2,
        banheiros_max: 1,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].path).toEqual(["banheiros_max"]);
        expect(parsed.error.issues[0].message).toBe(
          "O máximo de banheiros não pode ser menor que o mínimo.",
        );
      }
    });

    test("banheiros: máximo igual ao mínimo aprova", () => {
      const parsed = imovelFormSchema.safeParse({
        ...base(),
        banheiros_min: 1,
        banheiros_max: 1,
      });
      expect(parsed.success).toBe(true);
    });

    test("banheiros: um dos dois null aprova", () => {
      const parsed = imovelFormSchema.safeParse({
        ...base(),
        banheiros_min: null,
        banheiros_max: 1,
      });
      expect(parsed.success).toBe(true);
    });

    test("vagas: máximo menor que o mínimo reprova com issue em vagas_max", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), vagas_min: 2, vagas_max: 1 });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].path).toEqual(["vagas_max"]);
        expect(parsed.error.issues[0].message).toBe(
          "O máximo de vagas não pode ser menor que o mínimo.",
        );
      }
    });

    test("vagas: máximo igual ao mínimo aprova", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), vagas_min: 1, vagas_max: 1 });
      expect(parsed.success).toBe(true);
    });

    test("vagas: um dos dois null aprova", () => {
      const parsed = imovelFormSchema.safeParse({ ...base(), vagas_min: null, vagas_max: 1 });
      expect(parsed.success).toBe(true);
    });
  });

  test("valor_sob_consulta tem default false", () => {
    const parsed = imovelFormSchema.safeParse(base());
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.valor_sob_consulta).toBe(false);
  });

  test("ordem tem default 0", () => {
    const parsed = imovelFormSchema.safeParse(base());
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.ordem).toBe(0);
  });
});

describe("tipologiaSchema", () => {
  test("caso válido", () => {
    const parsed = tipologiaSchema.safeParse({
      nome: "2 dormitórios",
      area: 68,
      dormitorios: null,
      suites: null,
      banheiros: null,
      vagas: null,
      valor_a_partir_de: null,
    });
    expect(parsed.success).toBe(true);
  });

  test("caso inválido: sem nome", () => {
    const parsed = tipologiaSchema.safeParse({
      nome: "",
      area: null,
      dormitorios: null,
      suites: null,
      banheiros: null,
      vagas: null,
      valor_a_partir_de: null,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe um nome para a tipologia.");
    }
  });
});

describe("diferencialSchema", () => {
  test("caso válido no grupo lazer", () => {
    const parsed = diferencialSchema.safeParse({ grupo: "lazer", nome: "Piscina" });
    expect(parsed.success).toBe(true);
  });

  test("caso válido no grupo diferencial", () => {
    const parsed = diferencialSchema.safeParse({ grupo: "diferencial", nome: "Portaria 24h" });
    expect(parsed.success).toBe(true);
  });

  test("caso inválido: grupo fora do enum", () => {
    const parsed = diferencialSchema.safeParse({ grupo: "academia", nome: "Academia" });
    expect(parsed.success).toBe(false);
  });
});

describe("faqSchema", () => {
  test("caso válido", () => {
    const parsed = faqSchema.safeParse({
      pergunta: "Aceita FGTS?",
      resposta: "Sim, em todas as fases.",
    });
    expect(parsed.success).toBe(true);
  });

  test("caso inválido: resposta vazia", () => {
    const parsed = faqSchema.safeParse({ pergunta: "Aceita FGTS?", resposta: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe a resposta.");
    }
  });
});

describe("imagemSchema", () => {
  test("caso válido com default destaque false", () => {
    const parsed = imagemSchema.safeParse({ url: "/images/fachada.jpg", grupo: "empreendimento" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.destaque).toBe(false);
  });

  test("aceita os quatro grupos válidos", () => {
    for (const grupo of ["empreendimento", "decorado", "planta", "implantacao"] as const) {
      const parsed = imagemSchema.safeParse({ url: "/images/foto.jpg", grupo });
      expect(parsed.success).toBe(true);
    }
  });

  test("caso inválido: grupo fora do enum", () => {
    const parsed = imagemSchema.safeParse({ url: "/images/foto.jpg", grupo: "fachada" });
    expect(parsed.success).toBe(false);
  });
});
