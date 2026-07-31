"use client";

import { useDroppable } from "@dnd-kit/core";
import type { EtapaCRM } from "@/lib/crm/etapas";
import type { LeadQuadroCRM } from "@/lib/queries/admin-crm";
import { estadoDaEtapa } from "@/lib/crm/tempo";
import { formatarMoeda } from "@/lib/crm/calculos";
import { CardLead, type TagCatalogo } from "@/components/admin/crm/CardLead";
import { EstadoVazio } from "@/components/admin/crm/EstadoVazio";

export type ColunaEtapaProps = {
  etapa: EtapaCRM;
  leads: LeadQuadroCRM[];
  /** Total/soma "verdadeiros" da etapa (getContagensPorEtapa) — usados só quando não há filtro ativo (ver QuadroCRM.tsx). */
  contagemBase: { total: number; somaValorNegocio: number };
  filtroAtivo: boolean;
  arrastavel: boolean;
  tagsCatalogo: Record<string, TagCatalogo>;
  onEditar: (id: string) => void;
  onArquivar: (id: string) => void;
  onAlternarFavorito: (id: string) => void;
};

/**
 * Coluna droppable do quadro (docs/crm-spec.md §3.3/§4). Largura fixa — o
 * quadro inteiro é quem rola na horizontal (QuadroCRM.tsx), a coluna em si
 * não encolhe.
 */
export function ColunaEtapa({
  etapa,
  leads,
  contagemBase,
  filtroAtivo,
  arrastavel,
  tagsCatalogo,
  onEditar,
  onArquivar,
  onAlternarFavorito,
}: ColunaEtapaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.slug, disabled: !arrastavel });

  // Contagem/soma do cabeçalho: com filtro ativo, reflete o que está
  // efetivamente visível na coluna (senão a busca "erraria" ao mostrar 1
  // card e "7" no topo); sem filtro, usa a agregação verdadeira do banco —
  // que continua correta mesmo com a coluna truncada em 500 cards
  // (docs/crm-spec.md §5, caso de borda 10, e §6).
  const total = filtroAtivo ? leads.length : contagemBase.total;
  const soma = filtroAtivo
    ? leads.reduce((acc, l) => acc + (l.valor_negocio ?? 0), 0)
    : contagemBase.somaValorNegocio;

  const parados = leads.filter((l) => estadoDaEtapa(l.dias_na_etapa ?? 0, l.sla_dias) === "parado").length;

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[304px] flex-none flex-col rounded-lg border transition-colors motion-reduce:transition-none ${
        isOver ? "border-[var(--jade)] bg-[var(--jade)]/5" : "border-black/5 bg-black/[0.02]"
      }`}
    >
      <header className="px-3 pb-2 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--abissal)]">
            {etapa.label}
          </h2>
          <span className="flex-none text-xs text-neutral-500 [font-family:var(--mono),monospace]">{total}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="text-sm text-neutral-600 [font-family:var(--mono),monospace]">{formatarMoeda(soma)}</span>
          {parados > 0 ? (
            <span className="flex-none text-[11px] font-medium text-[var(--erro)]">
              {parados} {parados === 1 ? "parado" : "parados"}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-2 pb-3">
        {leads.length === 0 ? (
          <EstadoVazio
            variante="coluna"
            mensagem={filtroAtivo ? "Nenhum lead corresponde aos filtros." : "Nenhum lead nesta etapa."}
          />
        ) : (
          leads.map((lead) => (
            <CardLead
              key={lead.id}
              lead={lead}
              arrastavel={arrastavel}
              tagsCatalogo={tagsCatalogo}
              onEditar={onEditar}
              onArquivar={onArquivar}
              onAlternarFavorito={onAlternarFavorito}
            />
          ))
        )}
      </div>
    </div>
  );
}
