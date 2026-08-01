import { estaAtrasado } from "@/lib/crm/lembretes";
import type { LeadQuadroCRM } from "@/lib/queries/admin-crm";

/**
 * Busca, filtro e ordenação do quadro — tudo em memória (docs/crm-spec.md
 * §3.2): a resposta precisa ser instantânea por tecla digitada, sem
 * round-trip ao servidor. Camada pura: recebe a lista já carregada e
 * devolve uma nova lista; não sabe de onde os dados vieram nem para onde
 * vão.
 *
 * `LeadQuadroCRM` é o tipo canônico da linha do quadro, definido em
 * lib/queries/admin-crm.ts a partir de `vw_leads_crm` — antes de a view
 * existir em TS, este arquivo tinha o próprio formato inventado (camelCase,
 * com só um subconjunto de campos). O import é `type`-only: nenhum código de
 * lib/queries/admin-crm.ts (que é "server-only") entra no bundle do cliente
 * por causa dele, já que tipos são apagados na compilação.
 */
export type { LeadQuadroCRM };

/** Remove acentos e caixa para comparação — "José" casa com "jose". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Busca por nome, e-mail, telefone (só dígitos) ou protocolo — parcial, case e acento insensível. */
export function buscarLeads<T extends LeadQuadroCRM>(leads: T[], termo: string): T[] {
  const alvo = termo.trim();
  if (!alvo) return leads;

  const alvoNormalizado = normalizar(alvo);
  const alvoDigitos = alvo.replace(/\D/g, "");

  return leads.filter((lead) => {
    if (normalizar(lead.nome).includes(alvoNormalizado)) return true;
    if (normalizar(lead.email).includes(alvoNormalizado)) return true;
    if (normalizar(lead.protocolo).includes(alvoNormalizado)) return true;
    // Telefone só compara dígitos: "99812" tem que casar com "(19) 99812-4477".
    if (alvoDigitos && lead.telefone.replace(/\D/g, "").includes(alvoDigitos)) return true;
    return false;
  });
}

/** `null` filtra "sem responsável" (corretor_id is null); `undefined` não filtra. */
export function filtrarPorResponsavel<T extends LeadQuadroCRM>(
  leads: T[],
  responsavelId: string | null | undefined,
): T[] {
  if (responsavelId === undefined) return leads;
  return leads.filter((lead) => lead.corretor_id === responsavelId);
}

export function filtrarPorTag<T extends LeadQuadroCRM>(leads: T[], tag: string | undefined): T[] {
  if (!tag) return leads;
  return leads.filter((lead) => lead.tags.includes(tag));
}

export function filtrarFavoritos<T extends LeadQuadroCRM>(leads: T[], somenteFavoritos: boolean | undefined): T[] {
  if (!somenteFavoritos) return leads;
  return leads.filter((lead) => lead.favorito);
}

/** "Atrasado" aqui é sobre o próximo lembrete do lead, não sobre o SLA da etapa (lib/crm/tempo.ts). */
export function filtrarAtrasados<T extends LeadQuadroCRM>(
  leads: T[],
  somenteAtrasados: boolean | undefined,
  agora: string | Date = new Date(),
): T[] {
  if (!somenteAtrasados) return leads;
  return leads.filter((lead) => lead.proximo_lembrete_em !== null && estaAtrasado(lead.proximo_lembrete_em, agora));
}

export type FiltrosQuadro = {
  busca?: string;
  responsavelId?: string | null;
  tag?: string;
  somenteFavoritos?: boolean;
  somenteAtrasados?: boolean;
};

/** Aplica todos os filtros em sequência — a ordem não importa, cada um só remove itens. */
export function aplicarFiltros<T extends LeadQuadroCRM>(
  leads: T[],
  filtros: FiltrosQuadro,
  agora: string | Date = new Date(),
): T[] {
  let resultado = leads;
  if (filtros.busca) resultado = buscarLeads(resultado, filtros.busca);
  resultado = filtrarPorResponsavel(resultado, filtros.responsavelId);
  resultado = filtrarPorTag(resultado, filtros.tag);
  resultado = filtrarFavoritos(resultado, filtros.somenteFavoritos);
  resultado = filtrarAtrasados(resultado, filtros.somenteAtrasados, agora);
  return resultado;
}

export type CriterioOrdenacao =
  | "tempo-na-etapa" // mais tempo na etapa primeiro
  | "proximo-lembrete" // lembrete mais próximo primeiro; sem lembrete vai para o fim
  | "maior-valor" // maior valor_negocio primeiro; sem valor vai para o fim
  | "mais-recente"; // criado mais recentemente primeiro

// dias_na_etapa É campo de vw_leads_crm (e portanto de LeadQuadroCRM), mas a
// ordenação por tempo na etapa continua recebendo um mapa auxiliar opcional:
// permite reordenar com um valor recém-calculado (ex.: logo depois de mover
// um card no estado otimista, antes de o quadro ser recarregado do banco)
// sem depender de esperar o próximo fetch da view.
function compararNulosPorUltimo(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return null;
}

export function ordenarLeads<T extends LeadQuadroCRM>(
  leads: T[],
  criterio: CriterioOrdenacao,
  diasNaEtapaPorId?: Record<string, number>,
): T[] {
  const copia = [...leads];
  switch (criterio) {
    case "tempo-na-etapa":
      return copia.sort((a, b) => {
        const diasA = diasNaEtapaPorId?.[a.id] ?? a.dias_na_etapa ?? null;
        const diasB = diasNaEtapaPorId?.[b.id] ?? b.dias_na_etapa ?? null;
        const nulos = compararNulosPorUltimo(diasA, diasB);
        return nulos ?? diasB! - diasA!;
      });
    case "proximo-lembrete":
      return copia.sort((a, b) => {
        const dataA = a.proximo_lembrete_em ? new Date(a.proximo_lembrete_em).getTime() : null;
        const dataB = b.proximo_lembrete_em ? new Date(b.proximo_lembrete_em).getTime() : null;
        const nulos = compararNulosPorUltimo(dataA, dataB);
        return nulos ?? dataA! - dataB!;
      });
    case "maior-valor":
      return copia.sort((a, b) => {
        const nulos = compararNulosPorUltimo(a.valor_negocio, b.valor_negocio);
        return nulos ?? b.valor_negocio! - a.valor_negocio!;
      });
    case "mais-recente":
      return copia.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    default:
      return copia;
  }
}
