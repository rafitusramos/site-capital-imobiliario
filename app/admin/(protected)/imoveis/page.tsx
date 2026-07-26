import Link from "next/link";
import type { Metadata } from "next";
import { getImoveisAdmin } from "@/lib/queries/admin-imoveis";
import { TabelaImoveis } from "@/components/admin/TabelaImoveis";

export const metadata: Metadata = { title: "Imóveis · Admin" };

export default async function AdminImoveisPage() {
  const imoveis = await getImoveisAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--abissal)]">Empreendimentos</h1>
        <Link
          href="/admin/imoveis/novo"
          className="rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840]"
        >
          + Novo empreendimento
        </Link>
      </div>
      <TabelaImoveis imoveis={imoveis} />
    </div>
  );
}
