import { formatarPrecoAPartir } from "@/lib/imoveis/formato";
import type { LeadTipoSlug } from "@/types/database";
import type { LeadQuadroCRM } from "@/lib/queries/admin-crm";

/**
 * Cálculos do quadro do CRM — puro, sem I/O. `valorNegocio` espelha em
 * TypeScript a mesma prioridade por coalesce que `vw_leads_crm.valor_negocio`
 * usa em SQL (016_crm_campos_e_tags.sql): fin.valor_credito,
 * he.valor_credito_desejado, cons.valor_carta, im.orcamento_max — nessa
 * ordem, uma por `tipo`. Precisa existir aqui também (não só na view) porque
 * a tela de criação/edição manual de lead calcula o valor do negócio antes
 * de o lead existir no banco, quando a view ainda não tem linha para ler.
 */

export type DadosNegocio = {
  tipo: LeadTipoSlug;
  valorCredito?: number | null; // lead_financiamento.valor_credito
  valorCreditoDesejado?: number | null; // lead_home_equity.valor_credito_desejado
  valorCarta?: number | null; // lead_consorcio.valor_carta
  orcamentoMax?: number | null; // lead_imovel.orcamento_max
};

export function valorNegocio(dados: DadosNegocio): number | null {
  switch (dados.tipo) {
    case "financiamento":
      return dados.valorCredito ?? null;
    case "home-equity":
      return dados.valorCreditoDesejado ?? null;
    case "consorcio":
      return dados.valorCarta ?? null;
    case "imoveis":
      return dados.orcamentoMax ?? null;
    default:
      return null;
  }
}

/**
 * Loan-to-Value: crédito desejado sobre valor do imóvel em garantia. Não é
 * coluna no banco (docs/crm-spec.md §2.3) — gravar um derivado criaria a
 * chance de ele discordar das duas parcelas que o originam. Retorna a razão
 * (0.72 para 72%), não o texto formatado — quem exibe decide a casa decimal.
 */
export function ltv(
  valorCreditoDesejado: number | null | undefined,
  valorImovelGarantia: number | null | undefined,
): number | null {
  if (!valorCreditoDesejado || !valorImovelGarantia || valorImovelGarantia <= 0) return null;
  return valorCreditoDesejado / valorImovelGarantia;
}

/** LTV já formatado em percentual pt-BR, ou "—" quando não há como calcular. */
export function formatarLtv(
  valorCreditoDesejado: number | null | undefined,
  valorImovelGarantia: number | null | undefined,
): string {
  const razao = ltv(valorCreditoDesejado, valorImovelGarantia);
  if (razao === null) return "—";
  return razao.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Moeda BRL sem casas decimais — mesmo formato do cabeçalho de coluna do
 * quadro ("R$ 4.320.000", docs/crm-spec.md §4). Reaproveita
 * lib/imoveis/formato.ts (que já reaproveita lib/financeiro.ts `brl`) em vez
 * de duplicar a formatação.
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return formatarPrecoAPartir(valor) ?? "—";
}

/**
 * Soma de `valor_negocio` dos leads de uma coluna, para o cabeçalho do
 * quadro. Recebe um `Pick` do tipo canônico do quadro (lib/queries/admin-crm.ts)
 * em vez de um formato próprio — ao contrário de `DadosNegocio` acima, este
 * campo já existe tal e qual em `vw_leads_crm`, sem precisar de tradução.
 */
export function somaColuna(leads: Pick<LeadQuadroCRM, "valor_negocio">[]): number {
  return leads.reduce((soma, lead) => soma + (lead.valor_negocio ?? 0), 0);
}
