/**
 * Estado da barra de tempo do card — o elemento de assinatura visual do
 * quadro (docs/crm-spec.md §4). A cor nunca é a única informação (o card
 * também mostra "N dias em Etapa" por extenso), mas o estado em si é
 * puramente numérico: dias na etapa contra o SLA da etapa.
 */
export type EstadoEtapa = "no-prazo" | "atencao" | "parado";

/**
 * | Estado    | Condição              |
 * |-----------|------------------------|
 * | no-prazo  | dias ≤ sla             |
 * | atencao   | sla < dias ≤ 2×sla     |
 * | parado    | dias > 2×sla           |
 *
 * `slaDias` nulo (etapas finais: ganho, perdido, não qualificado) sempre
 * devolve "no-prazo" — não há relógio correndo contra um lead que já saiu
 * do funil.
 */
export function estadoDaEtapa(diasNaEtapa: number, slaDias: number | null): EstadoEtapa {
  if (slaDias === null) return "no-prazo";
  if (diasNaEtapa <= slaDias) return "no-prazo";
  if (diasNaEtapa <= slaDias * 2) return "atencao";
  return "parado";
}

/**
 * "13/07/2026 14:32", sempre no fuso de São Paulo — mesma régua de
 * lib/crm/lembretes.ts. Movida de PainelComum.tsx para cá (este já é o
 * módulo de tempo do CRM) porque ModalLead.tsx passou a precisar dela
 * também, no cabeçalho do modal.
 */
export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
