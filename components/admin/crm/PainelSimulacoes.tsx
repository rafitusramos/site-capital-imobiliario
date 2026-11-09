"use client";

import { useState } from "react";
import { urlDownloadSimulacao } from "@/app/actions/admin-simulacao";
import { useToast } from "@/lib/admin/toast";
import { formatarData } from "@/lib/crm/tempo";
import type { SimulacaoEnviada } from "@/lib/queries/admin-crm";

const ROTULO_STATUS: Record<SimulacaoEnviada["email_status"], string> = {
  enviado: "E-mail enviado",
  falhou: "Falha no envio",
  "sem-chave": "Envio não configurado",
};

export type PainelSimulacoesProps = {
  simulacoes: SimulacaoEnviada[];
  /** Abre o diálogo de simulação sem mover (reenvio/nova simulação, em qualquer etapa). */
  onEnviar: () => void;
};

/**
 * Bloco "Simulações" do modal de lead de financiamento (docs/crm-spec.md §3.7):
 * histórico de envios e o botão que abre o mesmo diálogo do movimento, sem mover.
 * O PDF baixa por URL assinada de 60 s; o bucket é privado.
 */
export function PainelSimulacoes({ simulacoes, onEnviar }: PainelSimulacoesProps) {
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
          onClick={onEnviar}
          className="min-h-[44px] rounded-md border border-[var(--jade)] px-3 text-sm font-semibold text-[var(--jade)] transition hover:bg-[var(--jade)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]"
        >
          Enviar simulação
        </button>
      </div>

      {simulacoes.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
          Nenhuma simulação enviada a este lead ainda.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {simulacoes.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-[var(--abissal)]">{formatarData(s.created_at)}</p>
                <p className="text-xs text-neutral-500">
                  {s.autor ? `Por ${s.autor} · ` : ""}
                  <span className={s.email_status === "enviado" ? "" : "text-[var(--erro)]"}>{ROTULO_STATUS[s.email_status]}</span>
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
          ))}
        </ul>
      )}
    </section>
  );
}
