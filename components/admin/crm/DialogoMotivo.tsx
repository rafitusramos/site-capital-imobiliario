"use client";

import { useEffect, useRef, useState } from "react";
import { IconeFechar } from "@/components/admin/crm/icones";

function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

export type MotivoOpcao = { slug: string; label: string };

export type DialogoMotivoProps = {
  /** `null` = fechado. Presente = aberto, movendo para a etapa `etapaLabel`. */
  estado: { etapaLabel: string } | null;
  motivos: MotivoOpcao[];
  pendente?: boolean;
  onConfirmar: (dados: { motivo: string; motivoObs?: string }) => void;
  onCancelar: () => void;
};

/**
 * Motivo obrigatório ao mover para Perdido/Não Qualificado (docs/crm-spec.md
 * §1.2, §3.3). Cancelar aqui desfaz o movimento otimista no chamador (caso de
 * borda 2, §5) — este componente só devolve `onCancelar()`, quem desfaz é o
 * `resolve(null)` da Promise que QuadroCRM.tsx mantém pendente dentro da
 * transição do useOptimistic.
 *
 * A validação replicada aqui (motivo obrigatório; `motivoObs` com pelo menos
 * 5 caracteres quando `motivo === "outro"`) é só para feedback antes do
 * round-trip — a mesma regra de `schemaMoverLead` (lib/validations/crm.ts) e,
 * na origem, de `mover_lead_crm` (017_crm_funcoes_rls.sql).
 */
export function DialogoMotivo({ estado, motivos, pendente = false, onConfirmar, onCancelar }: DialogoMotivoProps) {
  const [motivo, setMotivo] = useState("");
  const [motivoObs, setMotivoObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const ultimoFocoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!estado) return;
    setMotivo("");
    setMotivoObs("");
    setErro(null);
    ultimoFocoRef.current = document.activeElement as HTMLElement | null;
    const primeiro = painelRef.current?.querySelector<HTMLElement>("select");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!estado) return null;

  function confirmar() {
    if (!motivo) {
      setErro("Selecione um motivo.");
      return;
    }
    if (motivo === "outro" && motivoObs.trim().length < 5) {
      setErro("Descreva o motivo em pelo menos 5 caracteres.");
      return;
    }
    onConfirmar({ motivo, motivoObs: motivoObs.trim() || undefined });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-motivo-titulo"
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="dialogo-motivo-titulo" className="text-base font-semibold text-[var(--abissal)]">
            Mover para {estado.etapaLabel}
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

        <p className="mb-3 text-sm text-neutral-600">Essa etapa exige um motivo.</p>

        <label className="mb-1 block text-sm font-medium text-[var(--abissal)]" htmlFor="dialogo-motivo-select">
          Motivo
        </label>
        <select
          id="dialogo-motivo-select"
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setErro(null);
          }}
          className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]"
        >
          <option value="">Selecione…</option>
          {motivos.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.label}
            </option>
          ))}
        </select>

        {motivo === "outro" ? (
          <>
            <label className="mb-1 block text-sm font-medium text-[var(--abissal)]" htmlFor="dialogo-motivo-obs">
              Descreva o motivo
            </label>
            <textarea
              id="dialogo-motivo-obs"
              value={motivoObs}
              onChange={(e) => {
                setMotivoObs(e.target.value);
                setErro(null);
              }}
              rows={3}
              maxLength={500}
              className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]"
            />
          </>
        ) : null}

        {erro ? (
          <p role="alert" className="mb-3 text-sm text-[var(--erro)]">
            {erro}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={pendente}
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pendente}
            className="rounded-md bg-[var(--jade)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50"
          >
            {pendente ? "Movendo…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
