"use client";

import { useEffect, useRef } from "react";
import { IconeFechar } from "@/components/admin/crm/icones";

/** Elementos focáveis dentro de um container — mesmo critério de components/imoveis/LeadImovelModal.tsx. */
function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

export type ConfirmarAcaoProps = {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  /** Estilo do botão de confirmar — "perigo" para exclusão/arquivamento, "padrao" para o resto. */
  variante?: "perigo" | "padrao";
  pendente?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/**
 * Diálogo de confirmação reutilizável do admin (docs/crm-spec.md §3.1),
 * usado pelo arquivar (e por qualquer ação futura fora do CRM que precise do
 * mesmo "tem certeza?"). Prende o foco, fecha com Esc, devolve o foco a quem
 * abriu — mesmo contrato de components/imoveis/LeadImovelModal.tsx, adaptado
 * à paleta do admin (o admin não carrega styles/lp.css).
 */
export function ConfirmarAcao({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  rotuloCancelar = "Cancelar",
  variante = "padrao",
  pendente = false,
  onConfirmar,
  onCancelar,
}: ConfirmarAcaoProps) {
  const painelRef = useRef<HTMLDivElement>(null);
  const ultimoFocoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    ultimoFocoRef.current = document.activeElement as HTMLElement | null;
    const primeiro = painelRef.current?.querySelector<HTMLElement>("button");
    primeiro?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelar();
        return;
      }
      if (e.key !== "Tab" || !painelRef.current) return;
      const focaveis = elementosFocaveis(painelRef.current);
      if (focaveis.length === 0) return;
      const primeiroEl = focaveis[0];
      const ultimoEl = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiroEl) {
        e.preventDefault();
        ultimoEl.focus();
      } else if (!e.shiftKey && document.activeElement === ultimoEl) {
        e.preventDefault();
        primeiroEl.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      ultimoFocoRef.current?.focus();
    };
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 motion-reduce:transition-none"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div
        ref={painelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-acao-titulo"
        aria-describedby="confirmar-acao-descricao"
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="confirmar-acao-titulo" className="text-base font-semibold text-[var(--abissal)]">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Fechar"
            className="rounded-md p-1 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
          >
            <IconeFechar className="h-4 w-4" />
          </button>
        </div>
        <p id="confirmar-acao-descricao" className="mb-5 text-sm text-neutral-600">
          {descricao}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={pendente}
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] disabled:opacity-50"
          >
            {rotuloCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={pendente}
            className={`rounded-md px-3 py-2 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
              variante === "perigo"
                ? "bg-[var(--erro)] hover:bg-[#722f24] focus-visible:outline-[var(--erro)]"
                : "bg-[var(--jade)] hover:bg-[#175840] focus-visible:outline-[var(--jade)]"
            }`}
          >
            {pendente ? "Aguarde…" : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
