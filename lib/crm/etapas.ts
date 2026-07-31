import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

/**
 * Espelha os seeds de `crm_etapas` em `supabase/migrations/014_crm_pipelines.sql`.
 * Este arquivo e a migration 014 TÊM DE ANDAR JUNTOS: qualquer mudança de
 * label, cor, ordem, sla_dias ou exige_motivo feita numa precisa ser refeita
 * na outra. A integridade "lead nunca numa etapa de outro pipeline" é
 * garantida pela FK composta `(tipo, status)` no banco — este arquivo só
 * espelha o que já está lá para a interface não precisar de round-trip para
 * saber quais etapas existem, quais cores usar e qual é a etapa inicial.
 *
 * Por que `is_inicial` importa: os RPCs `criar_lead_*` (migration 003) não
 * passam `status` — dependem do `default 'criado'` da coluna. `etapaInicial`
 * aqui é só para a interface (ex.: criação manual de lead); a fonte da
 * verdade de qual etapa um lead novo recebe continua sendo o banco.
 */

export type EtapaCRM = {
  tipo: LeadTipoSlug;
  slug: LeadEtapaSlug;
  label: string;
  ordem: number;
  corBg: string;
  corTexto: string;
  isInicial: boolean;
  isFinal: boolean;
  isGanho: boolean;
  exigeMotivo: boolean;
  slaDias: number | null;
};

// Aparência e SLA por slug são os mesmos em todos os pipelines que usam a
// etapa (a tabela de seeds da 014 não varia cor/sla por tipo) — centralizado
// aqui para não repetir os mesmos 6 valores em cada linha de ETAPAS_POR_TIPO.
const APARENCIA: Record<
  LeadEtapaSlug,
  { label: string; corBg: string; corTexto: string; slaDias: number | null }
> = {
  criado: { label: "Criado", corBg: "#E9E5DA", corTexto: "#4A4437", slaDias: 1 },
  simulacao: { label: "Simulação", corBg: "#F0E2C8", corTexto: "#6B4E22", slaDias: 3 },
  qualificacao: { label: "Qualificação", corBg: "#F0E2C8", corTexto: "#6B4E22", slaDias: 2 },
  apresentacao: { label: "Apresentação", corBg: "#F0E2C8", corTexto: "#6B4E22", slaDias: 3 },
  "pre-aprovacao": { label: "Pré-Aprovação", corBg: "#D8E6DC", corTexto: "#1C4633", slaDias: 7 },
  visita: { label: "Visita", corBg: "#BFD9C8", corTexto: "#143728", slaDias: 5 },
  vistoria: { label: "Vistoria", corBg: "#BFD9C8", corTexto: "#143728", slaDias: 10 },
  proposta: { label: "Proposta", corBg: "#D8E6DC", corTexto: "#1C4633", slaDias: 5 },
  contrato: { label: "Contrato", corBg: "#1F6B4E", corTexto: "#FFFFFF", slaDias: 15 },
  ganho: { label: "Ganho", corBg: "#0A241C", corTexto: "#E8D9B8", slaDias: null },
  perdido: { label: "Perdido", corBg: "#F3DEDA", corTexto: "#7A2E22", slaDias: null },
  "nao-qualificado": { label: "Não Qualificado", corBg: "#E4E1DB", corTexto: "#55504A", slaDias: null },
};

// slug e is_ganho são fixos por natureza da etapa, não por pipeline.
const FINAL: ReadonlySet<LeadEtapaSlug> = new Set(["ganho", "perdido", "nao-qualificado"]);
const GANHO: ReadonlySet<LeadEtapaSlug> = new Set(["ganho"]);
// Entrar em 'perdido' ou 'nao-qualificado' exige motivo (docs/crm-spec.md §1.2).
const EXIGE_MOTIVO: ReadonlySet<LeadEtapaSlug> = new Set(["perdido", "nao-qualificado"]);

function construirPipeline(tipo: LeadTipoSlug, slugs: LeadEtapaSlug[]): EtapaCRM[] {
  return slugs.map((slug, indice) => {
    const aparencia = APARENCIA[slug];
    return {
      tipo,
      slug,
      label: aparencia.label,
      ordem: indice + 1,
      corBg: aparencia.corBg,
      corTexto: aparencia.corTexto,
      isInicial: slug === "criado",
      isFinal: FINAL.has(slug),
      isGanho: GANHO.has(slug),
      exigeMotivo: EXIGE_MOTIVO.has(slug),
      slaDias: aparencia.slaDias,
    };
  });
}

// Ordem e composição de cada pipeline: tabela da spec §1.1. Financiamento e
// Home Equity colapsam "Análise de Crédito" + "Crédito Aprovado" numa única
// "Pré-Aprovação" (decisão travada #1 do docs/crm-spec.md).
export const ETAPAS_POR_TIPO: Record<LeadTipoSlug, EtapaCRM[]> = {
  financiamento: construirPipeline("financiamento", [
    "criado",
    "simulacao",
    "pre-aprovacao",
    "vistoria",
    "contrato",
    "ganho",
    "perdido",
  ]),
  "home-equity": construirPipeline("home-equity", [
    "criado",
    "simulacao",
    "pre-aprovacao",
    "vistoria",
    "contrato",
    "ganho",
    "perdido",
  ]),
  consorcio: construirPipeline("consorcio", [
    "criado",
    "apresentacao",
    "proposta",
    "contrato",
    "ganho",
    "perdido",
  ]),
  imoveis: construirPipeline("imoveis", [
    "criado",
    "qualificacao",
    "visita",
    "proposta",
    "contrato",
    "ganho",
    "perdido",
    "nao-qualificado",
  ]),
};

/** Etapas do pipeline, na ordem do quadro (colunas da esquerda para a direita). */
export function etapasDoTipo(tipo: LeadTipoSlug): EtapaCRM[] {
  return ETAPAS_POR_TIPO[tipo];
}

/** A única etapa `is_inicial` do pipeline — sempre 'criado' (ver comentário acima). */
export function etapaInicial(tipo: LeadTipoSlug): EtapaCRM {
  const inicial = ETAPAS_POR_TIPO[tipo].find((etapa) => etapa.isInicial);
  if (!inicial) {
    // Não deveria acontecer: cada pipeline é montado aqui mesmo, com 'criado'
    // sempre presente. Se isso disparar, um pipeline foi editado sem manter
    // a invariante — tests/unidade/crm-etapas.test.ts existe para pegar isso
    // antes de chegar em produção.
    throw new Error(`Pipeline '${tipo}' não tem etapa inicial.`);
  }
  return inicial;
}

/** Etapa específica de um pipeline, ou undefined se o slug não pertence a ele. */
export function etapaPorSlug(tipo: LeadTipoSlug, slug: LeadEtapaSlug): EtapaCRM | undefined {
  return ETAPAS_POR_TIPO[tipo].find((etapa) => etapa.slug === slug);
}

/** true quando mover para `slug` nesse pipeline exige motivo (perdido/não qualificado). */
export function exigeMotivo(tipo: LeadTipoSlug, slug: LeadEtapaSlug): boolean {
  return etapaPorSlug(tipo, slug)?.exigeMotivo ?? false;
}
