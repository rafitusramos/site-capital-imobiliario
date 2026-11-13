import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { automacaoPorId } from "@/lib/queries/admin-instagram";
import { automacaoParaFormulario } from "@/lib/instagram/formulario";
import { EditorAutomacao } from "@/components/admin/instagram/EditorAutomacao";

export const metadata: Metadata = { title: "Editar automação · Admin" };
export const dynamic = "force-dynamic";

export default async function EditarAutomacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await automacaoPorId(id);
  if (!a) notFound();
  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Editar automação</h1>
      <EditorAutomacao inicial={automacaoParaFormulario(a)} />
    </div>
  );
}
