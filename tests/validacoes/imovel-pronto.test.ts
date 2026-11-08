import { describe, expect, test } from "vitest";
import { imovelFormSchema } from "@/lib/validations/imovel";

const TIPO_UUID = "123e4567-e89b-12d3-a456-426614174001";
const FASE_UUID = "123e4567-e89b-12d3-a456-426614174002";

/** Payload completo de um imóvel pronto — toda chave presente, como o editor envia. */
function pronto(extra: Record<string, unknown> = {}) {
  return {
    modalidade: "pronto",
    titulo: "Casa em condomínio no Marambaia",
    slug: "casa-condominio-marambaia",
    tipo_id: TIPO_UUID,
    area_util: 180,
    area_total: 300,
    dormitorios: 3,
    suites: 1,
    banheiros: 3,
    vagas: 2,
    valor_venda: 1250000,
    valor_condominio: 900,
    valor_iptu: 450,
    nome_condominio: "Residencial Marambaia",
    andar: null,
    mobiliado: false,
    ano_construcao: 2018,
    exibir_endereco: false,
    ...extra,
  };
}

describe("imovelFormSchema — discriminado por modalidade", () => {
  test("sem modalidade, o payload antigo continua sendo lançamento", () => {
    const parsed = imovelFormSchema.safeParse({
      titulo: "Residencial Jardim",
      slug: "residencial-jardim",
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
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.modalidade).toBe("lancamento");
  });

  test("modalidade desconhecida reprova", () => {
    expect(imovelFormSchema.safeParse(pronto({ modalidade: "terreno" })).success).toBe(false);
  });

  test("pronto válido passa e dispensa fase_id (o servidor define)", () => {
    const parsed = imovelFormSchema.safeParse(pronto());
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.modalidade === "pronto") {
      expect(parsed.data.valor_venda).toBe(1250000);
      expect(parsed.data.exibir_endereco).toBe(false);
    }
  });

  test("pronto não exige fase_id UUID, mas aceita um válido", () => {
    expect(imovelFormSchema.safeParse(pronto({ fase_id: FASE_UUID })).success).toBe(true);
    expect(imovelFormSchema.safeParse(pronto({ fase_id: "" })).success).toBe(true);
  });

  test("lançamento continua exigindo fase_id", () => {
    const parsed = imovelFormSchema.safeParse({
      modalidade: "lancamento",
      titulo: "Residencial Jardim",
      slug: "residencial-jardim",
      tipo_id: TIPO_UUID,
      fase_id: "não-é-uuid",
      area_min: null, area_max: null, dormitorios_min: null, dormitorios_max: null,
      banheiros_min: null, banheiros_max: null, vagas_min: null, vagas_max: null,
      valor_a_partir_de: null,
    });
    expect(parsed.success).toBe(false);
  });

  test("área total menor que a útil reprova", () => {
    const parsed = imovelFormSchema.safeParse(pronto({ area_util: 200, area_total: 150 }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(["area_total"]);
  });

  test("dormitórios decimais reprovam", () => {
    expect(imovelFormSchema.safeParse(pronto({ dormitorios: 2.5 })).success).toBe(false);
  });

  test("suítes não podem passar dos dormitórios", () => {
    const parsed = imovelFormSchema.safeParse(pronto({ dormitorios: 2, suites: 3 }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(["suites"]);
  });

  test("valores monetários negativos reprovam", () => {
    expect(imovelFormSchema.safeParse(pronto({ valor_venda: -1 })).success).toBe(false);
    expect(imovelFormSchema.safeParse(pronto({ valor_condominio: -10 })).success).toBe(false);
  });

  test("ano de construção fora de 1800..2100 reprova", () => {
    expect(imovelFormSchema.safeParse(pronto({ ano_construcao: 1500 })).success).toBe(false);
    expect(imovelFormSchema.safeParse(pronto({ ano_construcao: 2300 })).success).toBe(false);
  });

  test("vazios viram null", () => {
    const parsed = imovelFormSchema.safeParse(pronto({ area_total: "", nome_condominio: "", mobiliado: null }));
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.modalidade === "pronto") {
      expect(parsed.data.area_total).toBeNull();
      expect(parsed.data.nome_condominio).toBeNull();
      expect(parsed.data.mobiliado).toBeNull();
    }
  });
});

describe("video_data_publicacao (as duas modalidades)", () => {
  test("data ISO válida passa em pronto", () => {
    const parsed = imovelFormSchema.safeParse(pronto({ video_data_publicacao: "2026-03-15" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.video_data_publicacao).toBe("2026-03-15");
  });

  test("vazio vira null", () => {
    const parsed = imovelFormSchema.safeParse(pronto({ video_data_publicacao: "" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.video_data_publicacao).toBeNull();
  });

  test("formato inválido reprova", () => {
    expect(imovelFormSchema.safeParse(pronto({ video_data_publicacao: "15/03/2026" })).success).toBe(false);
    expect(imovelFormSchema.safeParse(pronto({ video_data_publicacao: "2026-13-45" })).success).toBe(false);
  });

  test("também vale para lançamento", () => {
    const parsed = imovelFormSchema.safeParse({
      modalidade: "lancamento",
      titulo: "Residencial Jardim",
      slug: "residencial-jardim",
      tipo_id: TIPO_UUID,
      fase_id: FASE_UUID,
      area_min: null, area_max: null, dormitorios_min: null, dormitorios_max: null,
      banheiros_min: null, banheiros_max: null, vagas_min: null, vagas_max: null,
      valor_a_partir_de: null,
      video_data_publicacao: "2026-01-02",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.video_data_publicacao).toBe("2026-01-02");
  });
});

describe("descricao_unidade (pronto)", () => {
  test("aparada e preservada", () => {
    const parsed = imovelFormSchema.safeParse(pronto({ descricao_unidade: "  Sala ampla com varanda.  " }));
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.modalidade === "pronto") {
      expect(parsed.data.descricao_unidade).toBe("Sala ampla com varanda.");
    }
  });

  test("vazia ou ausente vira null", () => {
    for (const extra of [{ descricao_unidade: "" }, {}]) {
      const parsed = imovelFormSchema.safeParse(pronto(extra));
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.modalidade === "pronto") {
        expect(parsed.data.descricao_unidade).toBeNull();
      }
    }
  });
});
