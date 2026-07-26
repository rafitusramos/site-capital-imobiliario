"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { importarMarkdown } from "@/app/actions/admin-posts";

export function ImportarMarkdown() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const formData = new FormData(e.currentTarget);
    const resultado = await importarMarkdown(formData);
    setEnviando(false);
    if (!resultado.sucesso || !resultado.id) {
      setErro(resultado.erro ?? "Não foi possível importar o artigo.");
      return;
    }
    router.replace(`/admin/posts/${resultado.id}`);
  }

  return (
    <form onSubmit={aoEnviar} className="max-w-lg">
      <p className="mb-6 text-sm text-neutral-600">
        Envie um arquivo <code>.md</code> seguindo o modelo em{" "}
        <code>docs/modelo-artigo.md</code> (no repositório) e, se tiver, uma imagem de capa. O
        artigo entra como rascunho — dá pra revisar tudo na tela de edição antes de publicar.
      </p>

      <label className="mb-1 block text-sm font-medium text-[var(--abissal)]" htmlFor="arquivo_md">
        Arquivo do artigo (.md)
      </label>
      <input
        id="arquivo_md"
        name="arquivo_md"
        type="file"
        accept=".md,text/markdown,text/plain"
        required
        className="mb-4 block w-full text-sm"
      />

      <label className="mb-1 block text-sm font-medium text-[var(--abissal)]" htmlFor="arquivo_capa">
        Imagem de capa (opcional)
      </label>
      <input
        id="arquivo_capa"
        name="arquivo_capa"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="mb-6 block w-full text-sm"
      />

      {erro ? <p className="mb-4 text-sm text-[var(--erro)]">{erro}</p> : null}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] disabled:opacity-50"
      >
        {enviando ? "Importando…" : "Importar"}
      </button>
    </form>
  );
}
