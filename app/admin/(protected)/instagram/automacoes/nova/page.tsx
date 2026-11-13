import type { Metadata } from "next";
import { palavrasUsadas } from "@/lib/queries/admin-instagram";
import { automacaoNova } from "@/lib/instagram/formulario";
import { EditorAutomacao } from "@/components/admin/instagram/EditorAutomacao";

export const metadata: Metadata = { title: "Nova automação · Admin" };

export const dynamic = "force-dynamic";

export default async function NovaAutomacaoPage() {
  const sugestoes = await palavrasUsadas();
  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Nova automação</h1>
      <EditorAutomacao inicial={automacaoNova()} palavrasSugeridas={sugestoes} />
    </div>
  );
}
