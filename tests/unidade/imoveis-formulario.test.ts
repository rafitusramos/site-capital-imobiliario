import { describe, expect, test } from "vitest";
import { imovelFormSchema } from "@/lib/validations/imovel";
import {
  montarPayloadImovel,
  valoresIniciaisDados,
  paraMoedaOuNull,
} from "@/lib/imoveis/formulario";

const TIPOS = [{ id: "123e4567-e89b-12d3-a456-426614174001", slug: "casa", nome: "Casa", ordem: 0, ativo: true, created_at: "" }];
const FASES = [
  { id: "123e4567-e89b-12d3-a456-426614174002", slug: "lancamento", nome: "Lançamento", ordem: 0, ativo: true, created_at: "" },
];

describe("valoresIniciaisDados", () => {
  test("imóvel novo pronto nasce com campos da unidade vazios", () => {
    const v = valoresIniciaisDados(null, TIPOS, FASES);
    expect(v.area_util).toBe("");
    expect(v.mobiliado).toBe("");
    expect(v.exibir_endereco).toBe(false);
    expect(v.video_data_publicacao).toBe("");
  });
});

describe("montarPayloadImovel", () => {
  function preenchido(modalidade: "lancamento" | "pronto") {
    const v = valoresIniciaisDados(null, TIPOS, FASES);
    return {
      ...v,
      titulo: "Casa no Marambaia",
      slug: "casa-marambaia",
      area_util: "180,5",
      dormitorios: "3",
      valor_venda: "R$ 1.250.000",
      mobiliado: "sim" as const,
      andar: "",
      video_data_publicacao: "2026-02-01",
      modalidade,
    };
  }

  test("pronto converte texto em número, boolean e null", () => {
    const payload = montarPayloadImovel(preenchido("pronto"), "pronto", undefined);
    expect(payload).toMatchObject({
      modalidade: "pronto",
      area_util: 180.5,
      dormitorios: 3,
      valor_venda: 1250000,
      mobiliado: true,
      andar: null,
      video_data_publicacao: "2026-02-01",
    });
    expect(payload).not.toHaveProperty("area_min");
    expect(payload).not.toHaveProperty("construtora");
  });

  test("pronto passa no schema do servidor", () => {
    const payload = montarPayloadImovel(preenchido("pronto"), "pronto", undefined);
    const { id: _id, ...dados } = payload as typeof payload & { id?: string };
    expect(imovelFormSchema.safeParse(dados).success).toBe(true);
  });

  test("lançamento mantém o payload de faixas e não carrega campos de unidade", () => {
    const payload = montarPayloadImovel(preenchido("lancamento"), "lancamento", "id-1");
    expect(payload).toMatchObject({ modalidade: "lancamento", id: "id-1", area_min: null });
    expect(payload).not.toHaveProperty("area_util");
  });

  test("mobiliado: '' é null, 'nao' é false", () => {
    expect(montarPayloadImovel({ ...preenchido("pronto"), mobiliado: "" as const }, "pronto", undefined)).toMatchObject({ mobiliado: null });
    expect(montarPayloadImovel({ ...preenchido("pronto"), mobiliado: "nao" as const }, "pronto", undefined)).toMatchObject({ mobiliado: false });
  });
});

describe("paraMoedaOuNull", () => {
  test("lê só os dígitos", () => {
    expect(paraMoedaOuNull("R$ 445.000")).toBe(445000);
    expect(paraMoedaOuNull("")).toBeNull();
  });
});
