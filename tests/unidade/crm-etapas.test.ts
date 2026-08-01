import { describe, expect, test } from "vitest";
import {
  ETAPAS_POR_TIPO,
  etapaAnterior,
  etapaInicial,
  etapaPorSlug,
  etapaProxima,
  etapasDoTipo,
  exigeMotivo,
  sequenciaLinear,
} from "@/lib/crm/etapas";
import type { LeadTipoSlug } from "@/types/database";

const TODOS_OS_TIPOS: LeadTipoSlug[] = ["financiamento", "home-equity", "imoveis", "consorcio"];

describe("integridade dos 4 pipelines", () => {
  test("existe uma entrada para cada um dos 4 tipos de lead", () => {
    expect(Object.keys(ETAPAS_POR_TIPO).sort()).toEqual([...TODOS_OS_TIPOS].sort());
  });

  // Os RPCs criar_lead_* (migration 003) não passam `status`: dependem do
  // `default 'criado'` da coluna. Se um pipeline não tivesse 'criado' como
  // única etapa inicial, a captação do site quebraria silenciosamente.
  test.each(TODOS_OS_TIPOS)("pipeline '%s' tem exatamente uma etapa is_inicial, e ela é 'criado'", (tipo) => {
    const iniciais = etapasDoTipo(tipo).filter((etapa) => etapa.isInicial);
    expect(iniciais).toHaveLength(1);
    expect(iniciais[0].slug).toBe("criado");
    expect(etapaInicial(tipo).slug).toBe("criado");
  });

  test.each(TODOS_OS_TIPOS)("pipeline '%s' não tem slugs duplicados", (tipo) => {
    const slugs = etapasDoTipo(tipo).map((etapa) => etapa.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test.each(TODOS_OS_TIPOS)("pipeline '%s' tem ordem sequencial começando em 1", (tipo) => {
    const ordens = etapasDoTipo(tipo).map((etapa) => etapa.ordem);
    expect(ordens).toEqual(ordens.map((_, indice) => indice + 1));
  });

  test("financiamento e home-equity colapsam em Pré-Aprovação (decisão travada #1)", () => {
    const slugsFinanciamento = etapasDoTipo("financiamento").map((e) => e.slug);
    const slugsHomeEquity = etapasDoTipo("home-equity").map((e) => e.slug);
    expect(slugsFinanciamento).toEqual([
      "criado",
      "simulacao",
      "pre-aprovacao",
      "vistoria",
      "contrato",
      "ganho",
      "perdido",
    ]);
    expect(slugsHomeEquity).toEqual(slugsFinanciamento);
    expect(slugsFinanciamento).not.toContain("analise-credito");
    expect(slugsFinanciamento).not.toContain("credito-aprovado");
  });

  test("consórcio não tem 'não qualificado' nem etapas de visita/vistoria", () => {
    const slugs = etapasDoTipo("consorcio").map((e) => e.slug);
    expect(slugs).toEqual(["criado", "apresentacao", "proposta", "contrato", "ganho", "perdido"]);
  });

  test("imóveis é o único pipeline com 'nao-qualificado'", () => {
    expect(etapasDoTipo("imoveis").map((e) => e.slug)).toEqual([
      "criado",
      "qualificacao",
      "visita",
      "proposta",
      "contrato",
      "ganho",
      "perdido",
      "nao-qualificado",
    ]);
    for (const tipo of ["financiamento", "home-equity", "consorcio"] as const) {
      expect(etapasDoTipo(tipo).map((e) => e.slug)).not.toContain("nao-qualificado");
    }
  });
});

describe("exigeMotivo", () => {
  test.each(TODOS_OS_TIPOS)("'perdido' exige motivo em todo pipeline que o tiver (%s)", (tipo) => {
    if (etapaPorSlug(tipo, "perdido")) {
      expect(exigeMotivo(tipo, "perdido")).toBe(true);
    }
  });

  test("'nao-qualificado' exige motivo (só existe em imóveis)", () => {
    expect(exigeMotivo("imoveis", "nao-qualificado")).toBe(true);
  });

  test("'ganho' e 'criado' não exigem motivo", () => {
    expect(exigeMotivo("financiamento", "ganho")).toBe(false);
    expect(exigeMotivo("financiamento", "criado")).toBe(false);
  });

  test("etapa que não existe no pipeline não exige motivo (é apenas ausente)", () => {
    expect(exigeMotivo("consorcio", "nao-qualificado")).toBe(false);
  });
});

describe("cores e SLA (seeds da migration 014)", () => {
  test("'ganho', 'perdido' e 'nao-qualificado' têm sla_dias nulo (etapas finais)", () => {
    expect(etapaPorSlug("financiamento", "ganho")?.slaDias).toBeNull();
    expect(etapaPorSlug("financiamento", "perdido")?.slaDias).toBeNull();
    expect(etapaPorSlug("imoveis", "nao-qualificado")?.slaDias).toBeNull();
  });

  test("'criado' tem sla_dias 1 e cores da migration 014", () => {
    const etapa = etapaPorSlug("financiamento", "criado");
    expect(etapa?.slaDias).toBe(1);
    expect(etapa?.corBg).toBe("#E9E5DA");
    expect(etapa?.corTexto).toBe("#4A4437");
  });

  test("'vistoria' tem sla_dias 10", () => {
    expect(etapaPorSlug("financiamento", "vistoria")?.slaDias).toBe(10);
  });

  test.each(TODOS_OS_TIPOS)("apenas 'ganho' é is_ganho no pipeline '%s'", (tipo) => {
    const ganhos = etapasDoTipo(tipo).filter((e) => e.isGanho);
    expect(ganhos).toHaveLength(1);
    expect(ganhos[0].slug).toBe("ganho");
  });

  test.each(TODOS_OS_TIPOS)("etapas finais do pipeline '%s' são exatamente ganho/perdido/nao-qualificado", (tipo) => {
    const finais = etapasDoTipo(tipo).filter((e) => e.isFinal).map((e) => e.slug);
    expect(finais.every((slug) => ["ganho", "perdido", "nao-qualificado"].includes(slug))).toBe(true);
    expect(finais).toContain("ganho");
    expect(finais).toContain("perdido");
  });
});

describe("etapaPorSlug", () => {
  test("devolve undefined para slug que não pertence ao pipeline", () => {
    expect(etapaPorSlug("consorcio", "vistoria")).toBeUndefined();
  });

  test("devolve a etapa quando pertence ao pipeline", () => {
    expect(etapaPorSlug("imoveis", "visita")?.label).toBe("Visita");
  });
});

// item 8 dos ajustes de CRM: bloco "Etapa" do PainelComum.tsx.
describe("sequenciaLinear", () => {
  test.each(TODOS_OS_TIPOS)("pipeline '%s' exclui etapas finais não-ganho da sequência", (tipo) => {
    const slugs = sequenciaLinear(tipo).map((e) => e.slug);
    expect(slugs).not.toContain("perdido");
    expect(slugs).not.toContain("nao-qualificado");
  });

  test("imóveis: sequência linear termina em 'ganho', sem 'perdido'/'nao-qualificado' no meio", () => {
    expect(sequenciaLinear("imoveis").map((e) => e.slug)).toEqual([
      "criado",
      "qualificacao",
      "visita",
      "proposta",
      "contrato",
      "ganho",
    ]);
  });

  test.each(TODOS_OS_TIPOS)("sequência linear de '%s' preserva a ordem de etapasDoTipo", (tipo) => {
    const linear = sequenciaLinear(tipo).map((e) => e.slug);
    const completa = etapasDoTipo(tipo)
      .map((e) => e.slug)
      .filter((slug) => linear.includes(slug));
    expect(linear).toEqual(completa);
  });
});

describe("etapaAnterior / etapaProxima", () => {
  test.each(TODOS_OS_TIPOS)("'%s': etapaAnterior('criado') é undefined (primeira etapa)", (tipo) => {
    expect(etapaAnterior(tipo, "criado")).toBeUndefined();
  });

  test.each(TODOS_OS_TIPOS)("'%s': etapaProxima('ganho') é undefined — nunca 'perdido'", (tipo) => {
    expect(etapaProxima(tipo, "ganho")).toBeUndefined();
  });

  test.each(TODOS_OS_TIPOS)("'%s': etapaAnterior('perdido') é undefined — fora da sequência linear", (tipo) => {
    if (etapaPorSlug(tipo, "perdido")) {
      expect(etapaAnterior(tipo, "perdido")).toBeUndefined();
    }
  });

  test.each(TODOS_OS_TIPOS)("'%s': etapaProxima('perdido') é undefined — fora da sequência linear", (tipo) => {
    if (etapaPorSlug(tipo, "perdido")) {
      expect(etapaProxima(tipo, "perdido")).toBeUndefined();
    }
  });

  test("imóveis: etapaAnterior('nao-qualificado') e etapaProxima('nao-qualificado') são undefined", () => {
    expect(etapaAnterior("imoveis", "nao-qualificado")).toBeUndefined();
    expect(etapaProxima("imoveis", "nao-qualificado")).toBeUndefined();
  });

  test("financiamento: etapaAnterior/etapaProxima andam um passo de cada vez na sequência linear", () => {
    expect(etapaAnterior("financiamento", "pre-aprovacao")?.slug).toBe("simulacao");
    expect(etapaProxima("financiamento", "pre-aprovacao")?.slug).toBe("vistoria");
    expect(etapaProxima("financiamento", "contrato")?.slug).toBe("ganho");
    expect(etapaAnterior("financiamento", "contrato")?.slug).toBe("vistoria");
  });

  test("etapa que não existe no pipeline: etapaAnterior/etapaProxima são undefined (não é erro)", () => {
    expect(etapaAnterior("consorcio", "vistoria")).toBeUndefined();
    expect(etapaProxima("consorcio", "vistoria")).toBeUndefined();
  });
});
