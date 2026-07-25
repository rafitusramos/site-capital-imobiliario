"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { despublicarPost, excluirPost, publicarPost } from "@/app/actions/admin-posts";
import type { PostAdmin } from "@/lib/queries/admin-posts";
import { formatarData } from "@/lib/blog/blog";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const STATUS_CLASSE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  published: "bg-[var(--jade)]/10 text-[var(--jade)]",
  archived: "bg-neutral-100 text-neutral-400",
};

const ICONE_CLASSE =
  "inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent";

function IconeEditar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" />
    </svg>
  );
}

function IconeOlho() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function IconeOlhoFechado() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 3l14 14" />
      <path d="M9.5 4.2C9.66 4.2 9.83 4 10 4c6 0 9 6 9 6a15.6 15.6 0 0 1-2.3 3.1M6.6 6.6C3.9 8 1 10 1 10s3 6 9 6c1 0 1.9-.15 2.7-.4" />
      <path d="M8.2 8.2a2.5 2.5 0 0 0 3.6 3.6" />
    </svg>
  );
}

function IconeLixeira() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 5h14M8 5V3.5A1.5 1.5 0 0 1 9.5 2h1A1.5 1.5 0 0 1 12 3.5V5m2 0v11a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6 16V5h8z" />
      <path d="M8.5 8.5v5M11.5 8.5v5" />
    </svg>
  );
}

export function TabelaPosts({ posts }: { posts: PostAdmin[] }) {
  const router = useRouter();
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function aoPublicar(post: PostAdmin) {
    setErro(null);
    setPendenteId(post.id);
    const resultado = await publicarPost(post.id, post.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível publicar o artigo.");
      return;
    }
    router.refresh();
  }

  async function aoDespublicar(post: PostAdmin) {
    setErro(null);
    setPendenteId(post.id);
    const resultado = await despublicarPost(post.id, post.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível despublicar o artigo.");
      return;
    }
    router.refresh();
  }

  async function aoExcluir(post: PostAdmin) {
    if (!confirm(`Excluir "${post.title}"? Essa ação não pode ser desfeita.`)) return;
    setErro(null);
    setPendenteId(post.id);
    const resultado = await excluirPost(post.id, post.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível excluir o artigo.");
      return;
    }
    router.refresh();
  }

  if (posts.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum artigo ainda.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
      {erro ? (
        <p className="border-b border-black/10 bg-red-50 px-4 py-2 text-sm text-[var(--erro)]">{erro}</p>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Título</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Publicado em</th>
            <th className="px-4 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-3 font-medium text-[var(--abissal)]">{post.title}</td>
              <td className="px-4 py-3 text-neutral-600">{post.categoria?.name ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSE[post.status] ?? ""}`}
                >
                  {STATUS_LABEL[post.status] ?? post.status}
                </span>
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {post.published_at ? formatarData(post.published_at) : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    title="Editar"
                    aria-label="Editar"
                    className={`${ICONE_CLASSE} text-[var(--jade)]`}
                  >
                    <IconeEditar />
                  </Link>
                  {post.status === "published" ? (
                    <button
                      type="button"
                      title="Despublicar"
                      aria-label="Despublicar"
                      disabled={pendenteId === post.id}
                      onClick={() => aoDespublicar(post)}
                      className={`${ICONE_CLASSE} text-neutral-600`}
                    >
                      <IconeOlhoFechado />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Publicar"
                      aria-label="Publicar"
                      disabled={pendenteId === post.id}
                      onClick={() => aoPublicar(post)}
                      className={`${ICONE_CLASSE} text-[var(--jade)]`}
                    >
                      <IconeOlho />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Excluir"
                    aria-label="Excluir"
                    disabled={pendenteId === post.id}
                    onClick={() => aoExcluir(post)}
                    className={`${ICONE_CLASSE} text-[var(--erro)]`}
                  >
                    <IconeLixeira />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
