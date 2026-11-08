import { FILTROS_INICIAIS, type CriterioOrdenacao, type EstadoFiltros } from "@/lib/crm/filtros";

/**
 * Filtros do quadro na URL (docs/crm-spec.md §3.2): recarregar a página ou
 * mandar o link para outra pessoa reproduz a mesma visão, e trocar de aba de
 * origem leva os filtros junto (todos são compatíveis entre origens: tags e
 * corretores são catálogos compartilhados). Camada pura — recebe e devolve
 * `URLSearchParams`, sem tocar em `window` nem no roteador.
 *
 * Parâmetros (omitidos quando iguais ao padrão):
 *   q, resp (uuid | "sem"), tag, fav=1, atrasados=1, parados=1,
 *   sem_lembrete=1, de, ate (AAAA-MM-DD), ordem.
 * Valor inválido vindo de uma URL editada à mão é ignorado, nunca erro.
 */

const CHAVES_FILTRO = [
  "q",
  "resp",
  "tag",
  "fav",
  "atrasados",
  "parados",
  "sem_lembrete",
  "de",
  "ate",
  "ordem",
] as const;

const ORDENACOES: ReadonlySet<string> = new Set<CriterioOrdenacao>([
  "tempo-na-etapa",
  "proximo-lembrete",
  "maior-valor",
  "mais-recente",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** AAAA-MM-DD que existe no calendário (rejeita 2026-02-31). */
function dataValida(valor: string | null): string | undefined {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor ? valor : undefined;
}

type FonteParams = { get(nome: string): string | null };

export function filtrosDaQuery(params: FonteParams): EstadoFiltros {
  const resp = params.get("resp");
  const ordem = params.get("ordem");
  return {
    busca: params.get("q") ?? "",
    responsavelId: resp === "sem" ? null : resp && UUID.test(resp) ? resp : undefined,
    tag: params.get("tag") || undefined,
    somenteFavoritos: params.get("fav") === "1",
    somenteAtrasados: params.get("atrasados") === "1",
    somenteParados: params.get("parados") === "1",
    semLembrete: params.get("sem_lembrete") === "1",
    criadoDe: dataValida(params.get("de")),
    criadoAte: dataValida(params.get("ate")),
    ordenacao: ordem && ORDENACOES.has(ordem) ? (ordem as CriterioOrdenacao) : FILTROS_INICIAIS.ordenacao,
  };
}

/**
 * Devolve uma cópia de `atual` com os parâmetros de filtro substituídos pelo
 * estado dado. Parâmetros alheios (`lead`, `novo`) passam intactos.
 */
export function filtrosParaQuery(atual: URLSearchParams, estado: EstadoFiltros): URLSearchParams {
  const params = new URLSearchParams(atual);
  for (const chave of CHAVES_FILTRO) params.delete(chave);

  if (estado.busca.trim() !== "") params.set("q", estado.busca);
  if (estado.responsavelId === null) params.set("resp", "sem");
  else if (estado.responsavelId !== undefined) params.set("resp", estado.responsavelId);
  if (estado.tag) params.set("tag", estado.tag);
  if (estado.somenteFavoritos) params.set("fav", "1");
  if (estado.somenteAtrasados) params.set("atrasados", "1");
  if (estado.somenteParados) params.set("parados", "1");
  if (estado.semLembrete) params.set("sem_lembrete", "1");
  if (estado.criadoDe) params.set("de", estado.criadoDe);
  if (estado.criadoAte) params.set("ate", estado.criadoAte);
  if (estado.ordenacao !== FILTROS_INICIAIS.ordenacao) params.set("ordem", estado.ordenacao);
  return params;
}

/** Só parâmetros de filtro, sem os alheios — o que a troca de aba de origem leva. */
export function soFiltros(atual: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const chave of CHAVES_FILTRO) {
    const valor = atual.get(chave);
    if (valor !== null) params.set(chave, valor);
  }
  return params;
}

/** Há algum filtro restringindo a lista? A ordenação não conta: não esconde lead nenhum. */
export function filtrosAtivos(f: EstadoFiltros): boolean {
  return (
    f.busca.trim() !== "" ||
    f.responsavelId !== undefined ||
    !!f.tag ||
    f.somenteFavoritos ||
    f.somenteAtrasados ||
    f.somenteParados ||
    f.semLembrete ||
    !!f.criadoDe ||
    !!f.criadoAte
  );
}
