"use client";

import { useId } from "react";
import type { Ordem } from "@/lib/admin/listas";

const CAMPO_BARRA =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";

export type OpcaoStatus = { valor: string; rotulo: string };

/**
 * Busca + filtro de status acima das tabelas do admin. A busca é um
 * `<input type="search">` com `<label>` visível para leitor de tela (o texto
 * fica em `sr-only` — o placeholder sozinho não conta como rótulo).
 */
export function BarraLista({
  rotuloBusca,
  placeholderBusca,
  busca,
  onBusca,
  status,
  onStatus,
  opcoesStatus,
  total,
  exibidos,
}: {
  rotuloBusca: string;
  placeholderBusca: string;
  busca: string;
  onBusca: (valor: string) => void;
  status: string;
  onStatus: (valor: string) => void;
  opcoesStatus: OpcaoStatus[];
  total: number;
  exibidos: number;
}) {
  const id = useId();
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor={`${id}-busca`} className="mb-1 block text-sm font-medium text-[var(--abissal)]">
          {rotuloBusca}
        </label>
        <input
          id={`${id}-busca`}
          type="search"
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          placeholder={placeholderBusca}
          autoComplete="off"
          className={`${CAMPO_BARRA} w-full`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-status`} className="mb-1 block text-sm font-medium text-[var(--abissal)]">
          Status
        </label>
        <select
          id={`${id}-status`}
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className={`${CAMPO_BARRA} w-full sm:w-44`}
        >
          <option value="todos">Todos</option>
          {opcoesStatus.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-neutral-500 sm:pb-2.5" aria-live="polite">
        {exibidos === total ? `${total} no total` : `${exibidos} de ${total}`}
      </p>
    </div>
  );
}

/**
 * Cabeçalho de coluna clicável. `aria-sort` fica na `<span>` de célula e o
 * botão tem foco visível; o indicador usa seta + texto, não só cor.
 */
export function CabecalhoOrdenavel({
  coluna,
  rotulo,
  ordem,
  onOrdenar,
}: {
  coluna: string;
  rotulo: string;
  ordem: Ordem;
  onOrdenar: (coluna: string) => void;
}) {
  const ativo = ordem?.coluna === coluna;
  const direcao = ativo ? ordem!.direcao : null;
  return (
    <span aria-sort={direcao === "asc" ? "ascending" : direcao === "desc" ? "descending" : "none"}>
      <button
        type="button"
        onClick={() => onOrdenar(coluna)}
        className="inline-flex items-center gap-1 rounded uppercase tracking-wide hover:text-[var(--abissal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]"
      >
        {rotulo}
        <span aria-hidden="true" className={ativo ? "text-[var(--jade)]" : "text-neutral-300"}>
          {direcao === "desc" ? "↓" : "↑"}
        </span>
        <span className="sr-only">
          {direcao === "asc" ? ", ordem crescente" : direcao === "desc" ? ", ordem decrescente" : ", ordenar"}
        </span>
      </button>
    </span>
  );
}
