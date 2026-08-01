"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ContagemAbaCRM } from "@/lib/queries/admin-crm";
import { ETAPAS_POR_TIPO } from "@/lib/crm/etapas";
import type { LeadTipoSlug } from "@/types/database";

const LABEL_ABA: Record<LeadTipoSlug, string> = {
  financiamento: "Financiamento",
  "home-equity": "Home Equity",
  consorcio: "Consórcio",
  imoveis: "Imóveis",
};

// Ordem fixa das abas — mesma ordem de exibição em toda a documentação do
// módulo (docs/crm-spec.md §1.1), independente da ordem de iteração de
// Object.keys sobre ETAPAS_POR_TIPO.
const ORDEM_ABAS: LeadTipoSlug[] = ["financiamento", "home-equity", "consorcio", "imoveis"];

/**
 * Abas de origem do CRM (docs/crm-spec.md §1.4/§3.1). Client component só
 * para ler `usePathname()` e destacar a aba ativa — mesma técnica de
 * components/admin/SidebarAdmin.tsx. `crm/layout.tsx` (que fica ACIMA de
 * `[origem]` na árvore de rotas) não recebe `params.origem`, então a
 * comparação por pathname é o jeito de saber qual aba está ativa sem uma
 * segunda consulta.
 */
export function AbasOrigem({ contagens }: { contagens: ContagemAbaCRM[] }) {
  const pathname = usePathname();
  const contagemPorTipo = new Map(contagens.map((c) => [c.tipo, c.total]));

  return (
    <nav aria-label="Origem dos leads" className="mb-0 border-b border-black/10">
      <ul className="flex flex-wrap gap-1">
        {ORDEM_ABAS.filter((tipo) => tipo in ETAPAS_POR_TIPO).map((tipo) => {
          const href = `/admin/crm/${tipo}`;
          const ativa = pathname?.startsWith(href) ?? false;
          const total = contagemPorTipo.get(tipo) ?? 0;
          return (
            <li key={tipo}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] ${
                  ativa
                    ? "border-[var(--jade)] text-[var(--jade)]"
                    : "border-transparent text-neutral-500 hover:text-[var(--abissal)]"
                }`}
              >
                {LABEL_ABA[tipo]}
                <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-xs [font-family:var(--mono),monospace]">
                  {total}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
