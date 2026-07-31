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
