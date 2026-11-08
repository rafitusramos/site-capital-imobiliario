import { CIDADES_ATENDIDAS } from "@/lib/site";

/** `areaServed` dos Service das landings, derivado de CIDADES_ATENDIDAS. */
export function areaServida() {
  return CIDADES_ATENDIDAS.map((name) => ({ "@type": "City" as const, name }));
}
