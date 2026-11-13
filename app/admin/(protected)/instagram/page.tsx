import type { Metadata } from "next";

export const metadata: Metadata = { title: "Instagram · Admin" };

// Provisório: a Caixa de entrada (Task 13) substitui esta página.
export default function CaixaDeEntradaPage() {
  return (
    <div className="max-w-xl rounded-md border border-neutral-200 bg-white p-6">
      <h1 className="mb-2 text-lg font-semibold text-[var(--abissal)]">Caixa de entrada</h1>
      <p className="text-sm text-neutral-600">Em construção. Por enquanto, crie e gerencie as automações na aba ao lado.</p>
    </div>
  );
}
