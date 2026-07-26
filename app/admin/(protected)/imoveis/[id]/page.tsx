import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getImovelByIdAdmin } from "@/lib/queries/admin-imoveis";
import { ImovelEditor } from "@/components/admin/ImovelEditor";

export const metadata: Metadata = { title: "Editar empreendimento · Admin" };

type PaginaEditarImovelProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarImovelPage({ params }: PaginaEditarImovelProps) {
  const { id } = await params;
  const imovel = await getImovelByIdAdmin(id);

  if (!imovel) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Editar empreendimento</h1>
      <ImovelEditor imovel={imovel} />
    </div>
  );
}
