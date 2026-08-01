"use client";

import { useDraggable } from "@dnd-kit/core";
import type { LeadQuadroCRM } from "@/lib/queries/admin-crm";
import { estadoDaEtapa, type EstadoEtapa } from "@/lib/crm/tempo";
import { ehHoje, estaAtrasado, rotuloRelativo } from "@/lib/crm/lembretes";
import { formatarMoeda } from "@/lib/crm/calculos";
import { mascaraTelefone } from "@/lib/mascaras";
import { AcoesCard } from "@/components/admin/crm/AcoesCard";
import { IconeEstrela, IconeEstrelaPreenchida, IconeRelogio } from "@/components/admin/crm/icones";

const COR_BARRA: Record<EstadoEtapa, string> = {
  "no-prazo": "var(--jade)",
  atencao: "var(--bronze)",
  parado: "var(--erro)",
};

/** Iniciais do responsável para o distintivo do card ("RT" para "Rafael Teixeira"). */
function iniciais(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export type TagCatalogo = { label: string; cor: string };

export type CardLeadProps = {
  lead: LeadQuadroCRM;
  arrastavel: boolean;
  tagsCatalogo: Record<string, TagCatalogo>;
  onEditar: (id: string) => void;
  onArquivar: (id: string) => void;
  onAlternarFavorito: (id: string) => void;
  agora?: Date;
  /** Card dentro do DragOverlay do dnd-kit (docs/crm-spec.md §3.3) — efeito de vidro, ver comentário no container abaixo. */
  fantasma?: boolean;
};

/**
 * Card do quadro (docs/crm-spec.md §1.3/§4). `useDraggable` (não
 * `useSortable`: não há ordenação manual dentro da coluna, §3.3) — o `id` é o
 * uuid do lead, único no quadro inteiro. Desabilitado abaixo de 768px
 * (`arrastavel=false`, decidido em QuadroCRM.tsx pela largura de viewport):
 * os `listeners`/`attributes` do dnd-kit simplesmente não são anexados, então
 * nenhum pointer/keyboard event inicia arraste — o card continua clicável
 * normalmente (editar/arquivar/favoritar).
 */
export function CardLead({
  lead,
  arrastavel,
  tagsCatalogo,
  onEditar,
  onArquivar,
  onAlternarFavorito,
  agora = new Date(),
  fantasma = false,
}: CardLeadProps) {
  // O `transform` de `useDraggable` é deliberadamente ignorado: o quadro usa
  // `DragOverlay` (QuadroCRM.tsx), e o dnd-kit entrega o deslocamento do
  // ponteiro aos DOIS — se o card de origem também o aplicasse, dois cards
  // viajariam junto com o cursor (o fantasma e o original a 40%), e os botões
  // de AcoesCard, que são irmãos posicionados em absoluto, ficariam para trás
  // na coluna. Com o overlay no comando, o card de origem fica parado no
  // lugar de onde saiu — que é justamente o que o `opacity-40` comunica.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: !arrastavel,
  });

  const estado = estadoDaEtapa(lead.dias_na_etapa ?? 0, lead.sla_dias);
  const corBarra = COR_BARRA[estado];

  const estilo = {
    // Barra de tempo (docs/crm-spec.md §4): borda esquerda de 3px cuja cor
    // é o único acento cromático do card. Aplicada via style (não classe
    // Tailwind) porque a cor é dinâmica (calculada por lead, não uma das
    // classes fixas do tema).
    borderLeftWidth: 3,
    borderLeftColor: corBarra,
  };

  const lembreteVencido = lead.proximo_lembrete_em ? estaAtrasado(lead.proximo_lembrete_em, agora) : false;
  const lembreteHoje = lead.proximo_lembrete_em ? ehHoje(lead.proximo_lembrete_em, agora) : false;
  const corLembrete = lembreteVencido ? "text-[var(--erro)]" : lembreteHoje ? "text-[var(--bronze)]" : "text-neutral-500";

  return (
    <div className={`group relative ${isDragging ? "z-10" : ""}`}>
      <div
        ref={setNodeRef}
        style={estilo}
        {...(arrastavel ? attributes : {})}
        {...(arrastavel ? listeners : {})}
        tabIndex={arrastavel ? 0 : undefined}
        role={arrastavel ? "button" : undefined}
        aria-roledescription={arrastavel ? "arrastável" : undefined}
        aria-label={
          arrastavel
            ? `Lead ${lead.nome}, protocolo ${lead.protocolo}. Pressione espaço para arrastar, use as setas para mover e espaço para soltar.`
            : undefined
        }
        className={`w-full rounded-md border border-black/5 p-2.5 transition-shadow motion-reduce:transition-none ${
          // Efeito de vidro no card fantasma do DragOverlay (docs/crm-spec.md
          // §3.3): junto com o opacity-40 do card que fica na coluna de
          // origem (abaixo), é o par que diz "este está sendo levado, aquele
          // é o lugar de onde saiu".
          fantasma
            ? "bg-white/60 shadow-lg ring-1 ring-white/50 backdrop-blur-md scale-[1.02] rotate-[1deg] motion-reduce:transform-none"
            : "bg-white shadow-sm"
        } ${
          arrastavel
            ? "cursor-grab touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] active:cursor-grabbing"
            : ""
        } ${isDragging ? "opacity-40" : "opacity-100"}`}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-medium text-neutral-500 [font-family:var(--mono),monospace]">
            {lead.protocolo}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAlternarFavorito(lead.id);
            }}
            aria-pressed={lead.favorito}
            aria-label={lead.favorito ? "Remover dos favoritos" : "Marcar como favorito"}
            title={lead.favorito ? "Remover dos favoritos" : "Marcar como favorito"}
            className="flex-none rounded-md p-0.5 text-[var(--bronze)] transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
          >
            {lead.favorito ? (
              <IconeEstrelaPreenchida className="h-4 w-4" />
            ) : (
              <IconeEstrela className="h-4 w-4 text-neutral-300" />
            )}
          </button>
        </div>

        <p className="truncate text-sm font-medium text-[var(--abissal)]" title={lead.nome}>
          {lead.nome}
        </p>
        <p className="mt-0.5 text-xs text-neutral-600 [font-family:var(--mono),monospace]">
          {mascaraTelefone(lead.telefone)}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500" title={lead.email}>
          {lead.email}
        </p>

        <div className="my-2 border-t border-black/5" />

        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
          <span>
            {lead.dias_na_etapa ?? 0} {lead.dias_na_etapa === 1 ? "dia" : "dias"} em {lead.etapa_label}
          </span>
          {lead.valor_negocio !== null ? (
            // text-sm font-bold: valor do negócio em destaque (item 3 dos
            // ajustes de CRM, rodada 2) — o texto ao redor da linha é
            // text-[11px], então "um pouco maior" já cumpre o pedido sem
            // brigar visualmente com o resto do card.
            <span className="flex-none text-sm font-bold [font-family:var(--mono),monospace]">
              {formatarMoeda(lead.valor_negocio)}
            </span>
          ) : null}
        </div>

        <p className="mb-1 text-[11px] text-neutral-500">
          {lead.ultima_interacao_em
            ? `Últ. contato · ${rotuloRelativo(lead.ultima_interacao_em, agora)}`
            : "Sem interação ainda"}
        </p>

        {lead.proximo_lembrete_em ? (
          <p className={`mb-1.5 flex items-center gap-1 text-[11px] font-medium ${corLembrete}`}>
            <IconeRelogio className="h-3 w-3 flex-none" />
            <span className="truncate">
              {lembreteVencido ? "Atrasado · " : "Retorno "}
              {rotuloRelativo(lead.proximo_lembrete_em, agora)}
            </span>
          </p>
        ) : null}

        <div className="flex items-center justify-start gap-2 pr-14">
          {lead.corretor_nome ? (
            <span
              title={lead.corretor_nome}
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--areia)] text-[10px] font-semibold text-[var(--abissal)]"
            >
              {iniciais(lead.corretor_nome)}
            </span>
          ) : (
            <span
              title="Sem responsável"
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-dashed border-neutral-300 text-[9px] text-neutral-400"
            >
              —
            </span>
          )}
          <div className="flex min-w-0 flex-wrap gap-1">
            {lead.tags.slice(0, 3).map((slug) => {
              const tag = tagsCatalogo[slug];
              return (
                <span
                  key={slug}
                  className="truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: `${(tag?.cor ?? "#8A6C48")}1a`, color: tag?.cor ?? "#8A6C48" }}
                >
                  {tag?.label ?? slug}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* AcoesCard é irmão do conteúdo arrastável (comentário do componente):
          por isso NÃO acompanha o transform do card durante o arraste, e
          ficaria "ancorado" na coluna de origem enquanto o card visualmente
          se move (item 2 dos ajustes de CRM, rodada 2). Sem `isDragging` some
          o próprio card arrastável; sem `fantasma` some o card fantasma do
          DragOverlay, que de qualquer forma não recebe clique nenhum. */}
      {!isDragging && !fantasma ? (
        <AcoesCard onEditar={() => onEditar(lead.id)} onArquivar={() => onArquivar(lead.id)} />
      ) : null}
    </div>
  );
}
