import type { Metadata } from "next";
import { getTiposEFases } from "@/lib/queries/imoveis";
import { ImovelEditor } from "@/components/admin/ImovelEditor";

export const metadata: Metadata = { title: "Novo empreendimento · Admin" };

export default async function NovoImovelPage() {
  const { tipos, fases } = await getTiposEFases();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Novo empreendimento</h1>
      <ImovelEditor imovel={null} tipos={tipos} fases={fases} />
    </div>
  );
}
