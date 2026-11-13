import type { Metadata } from "next";
import { automacaoNova } from "@/lib/instagram/formulario";
import { EditorAutomacao } from "@/components/admin/instagram/EditorAutomacao";

export const metadata: Metadata = { title: "Nova automação · Admin" };

export default function NovaAutomacaoPage() {
  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Nova automação</h1>
      <EditorAutomacao inicial={automacaoNova()} />
    </div>
  );
}
