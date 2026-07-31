"use client";

import { forwardRef } from "react";
import type { CriterioOrdenacao } from "@/lib/crm/filtros";
import { IconeBusca, IconeEstrela, IconeEstrelaPreenchida, IconeFiltro, IconeAlerta } from "@/components/admin/crm/icones";

export type EstadoFiltros = {
  busca: string;
  /** `undefined` = todos; `null` = sem responsável; string = um corretor específico. */
  responsavelId: string | null | undefined;
  tag: string | undefined;
  somenteFavoritos: boolean;
  somenteAtrasados: boolean;
  ordenacao: CriterioOrdenacao;
};

export const FILTROS_INICIAIS: EstadoFiltros = {
  busca: "",
  responsavelId: undefined,
  tag: undefined,
  somenteFavoritos: false,
  somenteAtrasados: false,
  ordenacao: "tempo-na-etapa",
};

export type AcaoFiltros =
  | { tipo: "BUSCA"; valor: string }
  | { tipo: "RESPONSAVEL"; valor: string | null | undefined }
  | { tipo: "TAG"; valor: string | undefined }
  | { tipo: "FAVORITOS"; valor: boolean }
  | { tipo: "ATRASADOS"; valor: boolean }
  | { tipo: "ORDENACAO"; valor: CriterioOrdenacao }
  | { tipo: "LIMPAR" };

/** Reducer puro dos filtros do quadro — QuadroCRM.tsx é quem chama useReducer com ele (docs/crm-spec.md §3.2). */
export function reducerFiltros(estado: EstadoFiltros, acao: AcaoFiltros): EstadoFiltros {
  switch (acao.tipo) {
    case "BUSCA":
      return { ...estado, busca: acao.valor };
    case "RESPONSAVEL":
      return { ...estado, responsavelId: acao.valor };
    case "TAG":
      return { ...estado, tag: acao.valor };
    case "FAVORITOS":
      return { ...estado, somenteFavoritos: acao.valor };
    case "ATRASADOS":
      return { ...estado, somenteAtrasados: acao.valor };
    case "ORDENACAO":
      return { ...estado, ordenacao: acao.valor };
    case "LIMPAR":
      return FILTROS_INICIAIS;
    default:
      return estado;
  }
}

const CRITERIOS_ORDENACAO: { valor: CriterioOrdenacao; label: string }[] = [
  { valor: "tempo-na-etapa", label: "Mais tempo na etapa" },
  { valor: "proximo-lembrete", label: "Lembrete mais próximo" },
  { valor: "maior-valor", label: "Maior valor" },
  { valor: "mais-recente", label: "Mais recente" },
];

const CAMPO =
  "rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-[var(--tinta)] focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";

const ALTERNADOR_BASE =
  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]";

export type BarraFiltrosProps = {
  filtros: EstadoFiltros;
  dispatch: (acao: AcaoFiltros) => void;
  corretores: { id: string; full_name: string }[];
  tags: { slug: string; label: string }[];
};

/**
 * Busca, responsável, tag, favoritos, atrasados e ordenação (docs/crm-spec.md
 * §3.1/§4). Tudo em memória via lib/crm/filtros.ts — QuadroCRM.tsx é quem
 * aplica de fato os filtros; este componente só emite intenção via
 * `dispatch`, sem round-trip nenhum ao servidor por tecla digitada.
 *
 * `forwardRef` no campo de busca: o atalho "/" (QuadroCRM.tsx) precisa de uma
 * ref para focar o input a partir do documento inteiro.
 */
export const BarraFiltros = forwardRef<HTMLInputElement, BarraFiltrosProps>(function BarraFiltros(
  { filtros, dispatch, corretores, tags },
  refBusca,
) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label className="relative">
        <span className="sr-only">Buscar por nome, e-mail, telefone ou protocolo</span>
        <IconeBusca className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          ref={refBusca}
          type="search"
          value={filtros.busca}
          onChange={(e) => dispatch({ tipo: "BUSCA", valor: e.target.value })}
          placeholder="Buscar (nome, e-mail, telefone, protocolo)…"
          className={`${CAMPO} w-64 pl-8`}
        />
      </label>

      <label className="sr-only" htmlFor="filtro-responsavel">
        Responsável
      </label>
      <select
        id="filtro-responsavel"
        value={filtros.responsavelId === undefined ? "todos" : filtros.responsavelId === null ? "sem" : filtros.responsavelId}
        onChange={(e) => {
          const v = e.target.value;
          dispatch({ tipo: "RESPONSAVEL", valor: v === "todos" ? undefined : v === "sem" ? null : v });
        }}
        className={CAMPO}
      >
        <option value="todos">Todos os responsáveis</option>
        <option value="sem">Sem responsável</option>
        {corretores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
          </option>
        ))}
      </select>

      {tags.length > 0 ? (
        <>
          <label className="sr-only" htmlFor="filtro-tag">
            Tag
          </label>
          <select
            id="filtro-tag"
            value={filtros.tag ?? "todas"}
            onChange={(e) => dispatch({ tipo: "TAG", valor: e.target.value === "todas" ? undefined : e.target.value })}
            className={CAMPO}
          >
            <option value="todas">Todas as tags</option>
            {tags.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => dispatch({ tipo: "FAVORITOS", valor: !filtros.somenteFavoritos })}
        aria-pressed={filtros.somenteFavoritos}
        className={`${ALTERNADOR_BASE} ${
          filtros.somenteFavoritos
            ? "border-[var(--bronze)] bg-[var(--bronze)]/10 text-[var(--bronze)]"
            : "border-neutral-300 text-neutral-600 hover:bg-black/5"
        }`}
      >
        {filtros.somenteFavoritos ? <IconeEstrelaPreenchida className="h-4 w-4" /> : <IconeEstrela className="h-4 w-4" />}
        Favoritos
      </button>

      <button
        type="button"
        onClick={() => dispatch({ tipo: "ATRASADOS", valor: !filtros.somenteAtrasados })}
        aria-pressed={filtros.somenteAtrasados}
        className={`${ALTERNADOR_BASE} ${
          filtros.somenteAtrasados
            ? "border-[var(--erro)] bg-[var(--erro)]/10 text-[var(--erro)]"
            : "border-neutral-300 text-neutral-600 hover:bg-black/5"
        }`}
      >
        <IconeAlerta className="h-4 w-4" />
        Atrasados
      </button>

      <label className="ml-auto flex items-center gap-1.5 text-sm text-neutral-500">
        <IconeFiltro className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Ordenar por</span>
        <select
          value={filtros.ordenacao}
          onChange={(e) => dispatch({ tipo: "ORDENACAO", valor: e.target.value as CriterioOrdenacao })}
          className={CAMPO}
        >
          {CRITERIOS_ORDENACAO.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
});
