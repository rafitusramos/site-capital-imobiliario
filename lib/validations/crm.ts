import { z } from "zod";
import { cpfValido, telefoneValido } from "@/lib/financeiro";
import { etapaPorSlug, exigeMotivo as etapaExigeMotivo } from "@/lib/crm/etapas";
import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

/**
 * Schemas Zod do módulo de CRM (docs/crm-spec.md §3.6). Segue o mesmo estilo
 * de lib/validations/lead.ts: normaliza (remove máscara) e valida no
 * servidor, sem confiar na formatação do cliente. Reaproveita
 * `telefoneValido`/`cpfValido` de lib/financeiro.ts em vez de reescrever.
 */

// ---- Campos comuns (nome, e-mail, telefone, cpf) ----
// Réplica intencional dos schemas privados de lib/validations/lead.ts: eles
// não são exportados de lá (são const de módulo), e o CRM precisa da mesma
// regra num contexto diferente (edição de lead existente, não só captação).

const nomeSchema = z.string().trim().min(3, "Informe o nome completo.");

const emailSchema = z.string().trim().email("Informe um e-mail válido.");

const telefoneSchema = z.string().transform((valor, ctx) => {
  if (!telefoneValido(valor)) {
    ctx.addIssue({ code: "custom", message: "Informe um telefone válido com DDD." });
    return z.NEVER;
  }
  return valor.replace(/\D/g, "");
});

const cpfSchema = z
  .string()
  .optional()
  .transform((valor) => (valor ? valor.replace(/\D/g, "") : undefined))
  .refine((valor) => valor === undefined || cpfValido(valor), { message: "Informe um CPF válido." });

const cepSchema = z
  .string()
  .optional()
  .transform((valor) => (valor ? valor.replace(/\D/g, "") : undefined))
  .refine((valor) => valor === undefined || valor.length === 8, { message: "CEP inválido." });

export const leadComumSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  telefone: telefoneSchema,
  cpf: cpfSchema,
  corretorId: z.string().uuid().nullable().optional(),
});

// ---- Valores monetários e numéricos compartilhados entre origens ----

// Teto de 999.999.999,99 é sanidade contra erro de digitação, mesmo espírito
// do teto em lib/validations/parametros.ts. O refine de duas casas usa
// tolerância (1e-6) em vez de igualdade estrita porque `valor * 100` sofre
// imprecisão de ponto flutuante binário (o mesmo problema que
// lib/parametros/taxa.ts documenta para taxas).
export const valorMonetarioSchema = z
  .number()
  .finite()
  .gte(0, "O valor não pode ser negativo.")
  .lte(999_999_999.99, "Valor alto demais.")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use no máximo duas casas decimais.");

export const prazoMesesSchema = z.number().int().min(1).max(420);
export const dormitoriosMinSchema = z.number().int().min(0).max(20);

// ---- Criar lead: comum + por origem (docs/crm-spec.md §2.3) ----
// Todo campo de origem é opcional: um lead criado à mão no CRM pode nascer
// sem linha de detalhe completa (caso de borda 5, docs/crm-spec.md §5) — é
// `atualizarLead` quem faz o upsert depois. Os campos que também existem
// como argumento de `criar_lead_*` (financiamento/home-equity/imóveis) usam
// o mesmo domínio de valores que lib/validations/lead.ts, para o formulário
// de criação manual e o do site nunca aceitarem valores diferentes para o
// "mesmo" campo.

export const criarLeadFinanciamentoSchema = leadComumSchema.extend({
  valorImovel: valorMonetarioSchema.optional(),
  percentualEntrada: z.number().finite().gte(0).lte(100).optional(),
  valorEntrada: valorMonetarioSchema.optional(),
  valorCredito: valorMonetarioSchema.optional(),
  prazoMeses: prazoMesesSchema.optional(),
  parcelaEstimada: valorMonetarioSchema.optional(),
  bancoSimulado: z.string().trim().min(1).optional(),
  rendaMensal: valorMonetarioSchema.optional(),
  usaFgts: z.boolean().optional(),
  tipoImovel: z.string().trim().min(1).optional(),
  primeiroImovel: z.boolean().optional(),
  tipoRemuneracao: z.string().trim().min(1).optional(),
  momentoCompra: z.string().trim().min(1).optional(),
  cidade: z.string().trim().min(1).optional(),
  estado: z.string().trim().length(2, "Informe a UF (2 letras).").toUpperCase().optional(),
});

export const criarLeadHomeEquitySchema = leadComumSchema.extend({
  valorImovelGarantia: valorMonetarioSchema.optional(),
  imovelQuitado: z.boolean().optional(),
  saldoDevedor: valorMonetarioSchema.optional(),
  // Desejado é o negociado pelo corretor (editável); estimado é o que saiu
  // do simulador do site (somenteLeitura em lib/crm/campos.ts) — os dois
  // convivem, ver nota de LTV em lib/crm/calculos.ts.
  valorCreditoDesejado: valorMonetarioSchema.optional(),
  valorCreditoEstimado: valorMonetarioSchema.optional(),
  prazoMeses: prazoMesesSchema.optional(),
  parcelaEstimada: valorMonetarioSchema.optional(),
  finalidade: z.string().trim().min(1).optional(),
  tipoImovel: z.string().trim().min(1).optional(),
  pessoa: z.enum(["fisica", "juridica"]).optional(),
  rendaMensal: valorMonetarioSchema.optional(),
  tipoRemuneracao: z.string().trim().min(1).optional(),
  cep: cepSchema,
  numero: z.string().trim().min(1).optional(),
  areaM2: z.number().finite().gt(0).optional(),
  situacaoImovel: z.enum(["quitado", "financiado", "alienado", "inventario"]).optional(),
});

export const criarLeadImovelSchema = leadComumSchema.extend({
  imovelId: z.string().uuid().optional(),
  formaPagamento: z.enum(["financiamento", "a_vista", "fgts_financiamento", "permuta"]).optional(),
  prazoCompra: z.enum(["imediato", "ate_3_meses", "ate_6_meses", "pesquisando"]).optional(),
  possuiEntrada: z.string().trim().optional(),
  valorEntrada: valorMonetarioSchema.optional(),
  jaTemAprovacao: z.boolean().optional(),
  observacoes: z.string().trim().optional(),
  // Não vêm do RPC: só existem em lead manual ou depois da qualificação.
  imovelDesejado: z.string().trim().min(1).optional(),
  orcamentoMax: valorMonetarioSchema.optional(),
  cidadePreferida: z.string().trim().min(1).optional(),
  dormitoriosMin: dormitoriosMinSchema.optional(),
  tipoImovel: z.string().trim().min(1).optional(),
});

// Consórcio não tem RPC de captação (sem formulário no site — decisão
// travada #2 do docs/crm-spec.md): todo campo é preenchido à mão.
export const criarLeadConsorcioSchema = leadComumSchema.extend({
  valorCarta: valorMonetarioSchema.optional(),
  prazoMeses: prazoMesesSchema.optional(),
  parcelaEstimada: valorMonetarioSchema.optional(),
  objetivo: z.string().trim().min(1).optional(),
  jaPossuiConsorcio: z.boolean().optional(),
  segmento: z.enum(["imovel", "veiculo", "servicos"]).optional(),
  grupo: z.string().trim().min(1).optional(),
  contemplacao: z.enum(["nao-contemplado", "em-lance", "contemplado"]).optional(),
});

export const schemaCriarLeadPorTipo = {
  financiamento: criarLeadFinanciamentoSchema,
  "home-equity": criarLeadHomeEquitySchema,
  imoveis: criarLeadImovelSchema,
  consorcio: criarLeadConsorcioSchema,
} satisfies Record<LeadTipoSlug, z.ZodTypeAny>;

// ---- Atualizar lead: os mesmos schemas, mas parciais ----
// `atualizarLead` faz upsert (caso de borda 5): editar um lead existente
// normalmente toca um campo de cada vez, então nome/email/telefone também
// viram opcionais aqui — ao contrário da criação, onde são a base do card.

export const atualizarLeadComumSchema = leadComumSchema.partial();

export const schemaAtualizarLeadPorTipo = {
  financiamento: criarLeadFinanciamentoSchema.partial(),
  "home-equity": criarLeadHomeEquitySchema.partial(),
  imoveis: criarLeadImovelSchema.partial(),
  consorcio: criarLeadConsorcioSchema.partial(),
} satisfies Record<LeadTipoSlug, z.ZodTypeAny>;

// ---- Mover lead (com motivo) ----

export const moverLeadBaseSchema = z.object({
  leadId: z.string().uuid(),
  etapa: z.string().min(1, "Selecione uma etapa."),
  motivo: z.string().optional(),
  motivoObs: z.string().optional(),
  // Concorrência otimista (docs/crm-spec.md §5, caso de borda 3): viaja para
  // o RPC mover_lead_crm comparar contra leads.updated_at.
  //
  // `offset: true` é obrigatório aqui, ao contrário dos `agendadoPara` abaixo:
  // este valor NÃO é produzido por `toISOString()` no cliente — ele vem do
  // banco, relido de `vw_leads_crm.updated_at`, e o PostgREST serializa
  // `timestamptz` com deslocamento ("2026-08-01T03:32:23.139576+00:00"), não
  // com o sufixo "Z". Sem `offset: true`, o zod só aceita a forma com "Z" e
  // reprova TODO arraste de card com "Invalid ISO datetime".
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

/**
 * A regra "motivo obrigatório ao entrar em perdido/não-qualificado, e
 * motivoObs com pelo menos 5 caracteres quando motivo = 'outro'" já é
 * imposta por `mover_lead_crm` (017_crm_funcoes_rls.sql) — essa é a
 * autoridade, e vale tanto para o arrastar quanto para o `select` do
 * formulário (docs/crm-spec.md §1.2). Esta função replica a mesma regra no
 * lado do Next só para devolver mensagem legível ANTES do round-trip ao
 * RPC; a validação aqui não substitui a de lá.
 *
 * Schema em função de `tipo` (não um objeto estático) porque "a etapa
 * pertence a este pipeline" e "esta etapa exige motivo" dependem de qual
 * pipeline o lead está — a mesma razão pela qual `schemaPorTipo` em
 * lib/validations/lead.ts é um mapa em vez de um schema único.
 */
export function schemaMoverLead(tipo: LeadTipoSlug) {
  return moverLeadBaseSchema.superRefine((dados, ctx) => {
    const etapa = etapaPorSlug(tipo, dados.etapa as LeadEtapaSlug);
    if (!etapa) {
      ctx.addIssue({ code: "custom", path: ["etapa"], message: "Etapa não pertence a este pipeline." });
      return;
    }
    if (!etapaExigeMotivo(tipo, etapa.slug)) return;

    if (!dados.motivo) {
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "Selecione um motivo." });
      return;
    }
    if (dados.motivo === "outro" && (dados.motivoObs ?? "").trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["motivoObs"],
        message: "Descreva o motivo em pelo menos 5 caracteres.",
      });
    }
  });
}

// ---- Nova interação, com lembrete opcional ----

// 'sistema' fica de fora: é reservado para o log automático
// (015_crm_interacoes_lembretes.sql), não é algo que a interface oferece
// como opção de "nova interação".
const TIPOS_INTERACAO_MANUAIS = [
  "ligacao",
  "whatsapp",
  "email",
  "reuniao",
  "visita",
  "proposta",
  "contrato",
  "nota",
] as const;

export const lembreteNovoSchema = z.object({
  agendadoPara: z
    .string()
    .datetime()
    .refine((v) => new Date(v).getTime() > Date.now(), "A data do lembrete precisa ser no futuro."),
  descricao: z
    .string()
    .trim()
    .min(3, "Descreva o lembrete.")
    .max(200, "Descrição longa demais (máx. 200 caracteres)."),
});

// Reagendar aceita data passada: é como o operador marca "isso já era" sem
// precisar concluir e recriar o lembrete (docs/crm-spec.md §3.6).
export const lembreteReagendarSchema = z.object({
  lembreteId: z.string().uuid(),
  agendadoPara: z.string().datetime(),
});

export const novaInteracaoSchema = z.object({
  leadId: z.string().uuid(),
  tipo: z.enum(TIPOS_INTERACAO_MANUAIS),
  conteudo: z
    .string()
    .trim()
    .min(1, "Escreva o conteúdo da interação.")
    .max(5000, "Conteúdo longo demais (máx. 5000 caracteres)."),
  lembrete: lembreteNovoSchema.optional(),
});

// ---- Tags ----

export const definirTagsSchema = z.object({
  leadId: z.string().uuid(),
  tags: z.array(z.string().trim().min(1)).max(8, "Máximo de 8 tags por lead."),
});

// Criar tag nova no catálogo compartilhado `crm_tags` (item 6 dos ajustes de
// CRM, rodada 2). Teto de 24 caracteres: é um chip, não um campo de texto
// livre — o mesmo espírito do teto de 200/5000 em novaInteracaoSchema, só
// que bem mais apertado porque o rótulo precisa caber num rounded-full.
export const criarTagSchema = z.object({
  label: z.string().trim().min(2, "A tag precisa de pelo menos 2 caracteres.").max(24, "Máximo de 24 caracteres."),
});

// ---- Atribuição de responsável ----

export const atribuirResponsavelSchema = z.object({
  leadId: z.string().uuid(),
  // null = "sem responsável" (largar o lead) — distinto de omitir o campo.
  corretorId: z.string().uuid().nullable(),
});
