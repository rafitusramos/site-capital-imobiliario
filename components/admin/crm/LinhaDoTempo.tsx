"use client";

import { obterIconeInteracao } from "@/components/admin/crm/icones";
import { EstadoVazio } from "@/components/admin/crm/EstadoVazio";
import type { LinhaTimelineCRM } from "@/lib/queries/admin-crm";

/** "13/07/2026 14:32", sempre no fuso de São Paulo (mesma régua de lib/crm/lembretes.ts). */
function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export type LinhaDoTempoProps = {
  itens: LinhaTimelineCRM[];
};

/**
 * Histórico cronológico unificado de `getTimeline` — interações e
 * transições de etapa, mais recente primeiro (a própria `vw_crm_timeline` já
 * devolve nessa ordem; docs/crm-spec.md §3.1). Transições de etapa
 * (`natureza === "etapa"`) e interações automáticas (`automatica === true`,
 * reservado ao tipo 'sistema') são visualmente mais discretas que uma nota
 * escrita por gente — sem cor de destaque, texto menor.
 */
export function LinhaDoTempo({ itens }: LinhaDoTempoProps) {
  if (itens.length === 0) {
    return <EstadoVazio variante="coluna" mensagem="Nenhum histórico ainda." />;
  }

  return (
    <ol className="space-y-3">
      {itens.map((item, indice) => {
        const automatico = item.natureza === "etapa" || item.automatica;
        const Icone = item.natureza === "interacao" ? obterIconeInteracao(item.tipo) : null;

        return (
          <li key={`${item.lead_id}-${item.ocorrido_em}-${indice}`} className="flex gap-2.5">
            <div
              className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${
                automatico ? "bg-black/5 text-neutral-400" : "bg-[var(--jade)]/10 text-[var(--jade)]"
              }`}
              aria-hidden="true"
            >
              {Icone ? <Icone className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${automatico ? "text-neutral-500" : "text-[var(--abissal)]"}`}>
                <span className="font-medium">{item.tipo_label ?? item.tipo}</span>
                {item.autor_nome ? <span className="text-neutral-400"> · {item.autor_nome}</span> : null}
                <span className="text-neutral-400"> · {formatarData(item.ocorrido_em)}</span>
              </p>
              {item.corpo ? (
                <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${automatico ? "text-neutral-500" : "text-[var(--tinta)]"}`}>
                  {item.corpo}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
