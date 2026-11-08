/**
 * Rótulo de quem arquivou. `arquivado_por` nulo significa "sistema": o job
 * pg_cron da migration 023 (docs/crm-spec.md §1.5). Arquivamento manual não
 * ganha rótulo — a tela de arquivados não mostra o nome de quem arquivou.
 */
export function rotuloArquivamento(lead: { arquivado_por: string | null }): string | null {
  return lead.arquivado_por === null ? "Arquivado automaticamente" : null;
}
