import { formatarData } from "@/lib/crm/tempo";

/**
 * Texto de "Última atualização" em /admin/parametros. Delega a
 * `formatarData`, que fixa `America/Sao_Paulo`: o componente renderiza no
 * servidor (UTC) e hidrata no navegador, e sem fuso explícito os dois textos
 * divergem (React #418).
 */
export function formatarAtualizacao(iso: string | null): string {
  if (!iso) return "nunca editado — valor de fábrica";
  return formatarData(iso);
}
