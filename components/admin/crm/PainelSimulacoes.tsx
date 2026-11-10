"use client";

import { useState } from "react";
import { urlDownloadSimulacao } from "@/app/actions/admin-simulacao";
import { useToast } from "@/lib/admin/toast";
import { formatarData } from "@/lib/crm/tempo";
import { rotuloStatusSimulacao } from "@/lib/simulacao/historico";
import type { SimulacaoEnviada } from "@/lib/queries/admin-crm";

export type PainelSimulacoesProps = {
  simulacoes: SimulacaoEnviada[];
  /** Abre o diálogo em modo "anexar": lê o PDF, mostra a prévia e grava. Nada é enviado. */
  onAnexar: () => void;
};

/**
 * Bloco "Simulações" do modal de lead de financiamento (docs/crm-spec.md §3.7):
 * histórico (anexada / enviada em ... / falhou) e o botão "Anexar simulação".
 * Anexar só guarda o PDF; o e-mail sai no movimento Criado -> Simulação, e não há
 * botão de enviar aqui. O PDF baixa por URL assinada de 60 s; o bucket é privado.
 */
export function PainelSimulacoes({ simulacoes, onAnexar }: PainelSimulacoesProps) {
  const { mostrarToast } = useToast();
  const [baixando, setBaixando] = useState<string | null>(null);

  async function baixar(id: string) {
    setBaixando(id);
    try {
      const r = await urlDownloadSimulacao(id);
      if (!r.sucesso || !r.url) {
        mostrarToast("erro", r.erro ?? "Não foi possível baixar o PDF.");
        return;
      }
      window.location.assign(r.url);
    } finally {
      setBaixando(null);
    }
  }

  return (
    <section aria-labelledby="simulacoes-titulo">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="simulacoes-titulo" className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Simulações
        </h3>
        <button
          type="button"
          onClick={onAnexar}
          className="min-h-[44px] rounded-md border border-[var(--jade)] px-3 text-sm font-semibold text-[var(--jade)] transition hover:bg-[var(--jade)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]"
        >
          Anexar simulação
        </button>
      </div>

      {simulacoes.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
          Nenhuma simulação anexada a este lead ainda.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {simulacoes.map((s) => {
            const status = rotuloStatusSimulacao(s);
            return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-[var(--abissal)]">{formatarData(s.created_at)}</p>
                <p className="text-xs text-neutral-500">
                  {s.autor ? `Por ${s.autor} · ` : ""}
                  <span className={status.problema ? "text-[var(--erro)]" : ""}>{status.texto}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => baixar(s.id)}
                disabled={baixando === s.id}
                className="min-h-[44px] rounded-md px-3 text-sm font-medium text-[var(--jade)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] disabled:opacity-50"
              >
                {baixando === s.id ? "Abrindo…" : "Baixar PDF"}
              </button>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
