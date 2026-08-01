"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Mesmo conjunto de origens de AbasOrigem.tsx/lib/crm/etapas.ts, mas listado
// aqui em vez de importado: só serve para reconhecer "estou numa página de
// origem" pelo pathname, não para desenhar nada — importar ETAPAS_POR_TIPO
// só por isso seria acoplamento sem ganho.
const PATHNAME_ORIGEM = /^\/admin\/crm\/(financiamento|home-equity|consorcio|imoveis)(\/|$)/;

/**
 * Ações do cabeçalho do CRM (docs/crm-spec.md §1.4): "Arquivados" e "+ Novo
 * lead" saem da faixa acima do quadro (que existia por página) e passam a
 * dividir a linha do `<h1>CRM</h1>`, em `crm/layout.tsx`. Client component só
 * para ler `usePathname()` — o layout que o monta é Server Component e fica
 * ACIMA de `[origem]` na árvore de rotas, então não recebe `params.origem`.
 */
export function AcoesCabecalhoCRM() {
  const pathname = usePathname();
  const emPaginaDeOrigem = pathname ? PATHNAME_ORIGEM.test(pathname) : false;

  return (
    <div className="flex items-center gap-4">
      {/* Ponte para a lixeira do CRM (docs/crm-spec.md §1.4) — "a lixeira
          arquiva" (decisão travada #3): é daqui que se restaura ou exclui
          de vez. */}
      <Link
        href="/admin/crm/arquivados"
        className="text-sm font-medium text-neutral-500 transition hover:text-[var(--abissal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]"
      >
        Arquivados
      </Link>
      {/* Só numa aba de origem: em /admin/crm/arquivados o `?novo=1` não abre
          modal nenhum — quem monta o NovoLeadModal é o QuadroCRM, que não é
          renderizado nessa rota. */}
      {emPaginaDeOrigem ? (
        <Link
          href={`${pathname}?novo=1`}
          title="Atalho: n"
          className="rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]"
        >
          + Novo lead
        </Link>
      ) : null}
    </div>
  );
}
