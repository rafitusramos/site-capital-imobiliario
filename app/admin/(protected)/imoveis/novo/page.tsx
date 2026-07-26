import type { Metadata } from "next";
import { ImovelEditor } from "@/components/admin/ImovelEditor";

export const metadata: Metadata = { title: "Novo empreendimento · Admin" };

export default function NovoImovelPage() {
  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Novo empreendimento</h1>
      <ImovelEditor imovel={null} />
    </div>
  );
}
