"use client";

import { IconeLapis, IconeLixeira } from "@/components/admin/crm/icones";

const BOTAO =
  // 32x32 visível; `before:-inset-1.5` estende o alvo de toque para 44x44
  // efetivo sem alargar o círculo visual (docs/crm-spec.md §4). Visível no
  // hover e no foco de teclado do CARD (a classe `group-*` vem do container
  // em CardLead.tsx), e sempre visível abaixo de 1024px — abaixo desse
  // ponto de corte não existe hover para revelar o botão (regra dura do
  // escopo: "interface que só existe no hover não existe no toque").
  "relative flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-neutral-600 shadow-sm ring-1 ring-black/10 transition before:absolute before:-inset-1.5 before:content-[''] hover:bg-[var(--marfim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] max-lg:opacity-100";

export type AcoesCardProps = {
  onEditar: () => void;
  onArquivar: () => void;
};

/**
 * Os dois botões circulares flutuantes do card (docs/crm-spec.md §1.3/§4):
 * editar (navega para `?lead=<id>` — o gancho do modal, ainda não
 * implementado) e arquivar (com confirmação, feita pelo chamador via
 * ConfirmarAcao). Renderizado como IRMÃO do conteúdo arrastável do card
 * (nunca dentro dele — mesma separação que
 * components/admin/GaleriaImovel.tsx usa entre a miniatura arrastável e o
 * botão de remover), então nenhum clique aqui é interpretado como início de
 * arraste.
 */
export function AcoesCard({ onEditar, onArquivar }: AcoesCardProps) {
  return (
    <div className="pointer-events-none absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none max-lg:opacity-100">
      <button
        type="button"
        onClick={onEditar}
        title="Editar"
        aria-label="Editar lead"
        className={`${BOTAO} pointer-events-auto`}
      >
        <IconeLapis className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onArquivar}
        title="Arquivar"
        aria-label="Arquivar lead"
        className={`${BOTAO} pointer-events-auto text-[var(--erro)]`}
      >
        <IconeLixeira className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
