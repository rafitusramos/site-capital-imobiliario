import type { Metadata } from "next";
import { getContagensPorAba } from "@/lib/queries/admin-crm";
import { AbasOrigem } from "@/components/admin/crm/AbasOrigem";
import { AcoesCabecalhoCRM } from "@/components/admin/crm/AcoesCabecalhoCRM";

export const metadata: Metadata = { title: "CRM · Admin" };

/**
 * Layout do módulo de CRM (docs/crm-spec.md §3.1): abas de origem por cima do
 * quadro. Server component — busca a contagem por aba uma vez só aqui, em
 * vez de cada `[origem]/page.tsx` repetir a mesma consulta. A aba ativa é
 * decidida em AbasOrigem.tsx (client component) a partir do pathname: este
 * layout fica ACIMA do segmento dinâmico `[origem]` na árvore de rotas, então
 * não recebe `params.origem` diretamente.
 */
export default async function CRMLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const contagens = await getContagensPorAba();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--abissal)]">CRM</h1>
        <AcoesCabecalhoCRM />
      </div>
      <AbasOrigem contagens={contagens} />
      {children}
    </div>
  );
}
