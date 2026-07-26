import type { Metadata } from "next";
import Link from "next/link";
import { ImportarMarkdown } from "@/components/admin/ImportarMarkdown";

export const metadata: Metadata = { title: "Importar artigo · Admin" };

export default function ImportarPostPage() {
  return (
    <div>
      <Link href="/admin/posts" className="mb-4 inline-block text-sm text-neutral-500 hover:text-[var(--abissal)]">
        ← Voltar para artigos
      </Link>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Importar artigo de Markdown</h1>
      <ImportarMarkdown />
    </div>
  );
}
