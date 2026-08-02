"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  despublicarPost,
  excluirPost,
  publicarPost,
  salvarPost,
  uploadCapa,
} from "@/app/actions/admin-posts";
import { slugify } from "@/lib/blog/slugify";
import type { PostAdmin } from "@/lib/queries/admin-posts";
import type { Database } from "@/types/database";

type Categoria = Database["public"]["Tables"]["categories"]["Row"];

type Valores = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category_id: string;
  rotulo: string;
  cta_pagina: string;
  seo_title: string;
  seo_description: string;
};

type Enviando = "rascunho" | "publicar" | "despublicar" | "excluir" | "capa" | null;

function valoresIniciais(post: PostAdmin | null): Valores {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    cover_image: post?.cover_image ?? "",
    category_id: post?.category_id ?? "",
    rotulo: post?.rotulo ?? "",
    cta_pagina: post?.cta_pagina ?? "",
    seo_title: post?.seo_title ?? "",
    seo_description: post?.seo_description ?? "",
  };
}

const CAMPO =
  "mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";

export function PostEditor({
  categorias,
  post,
}: {
  categorias: Categoria[];
  post: PostAdmin | null;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(() => valoresIniciais(post));
  // Em edição, título não deve regerar o slug sozinho (o slug já é uma URL real).
  // Em criação, o slug segue o título até o usuário editá-lo manualmente.
  const [slugTocado, setSlugTocado] = useState(Boolean(post));
  const [aba, setAba] = useState<"editar" | "preview">("editar");
  const [confirmaSlug, setConfirmaSlug] = useState(false);
  const [enviando, setEnviando] = useState<Enviando>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function setValor<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  function aoMudarTitulo(e: ChangeEvent<HTMLInputElement>) {
    const titulo = e.target.value;
    setValores((atual) => ({
      ...atual,
      title: titulo,
      slug: slugTocado ? atual.slug : slugify(titulo),
    }));
  }

  function aoMudarSlug(e: ChangeEvent<HTMLInputElement>) {
    setSlugTocado(true);
    setValor("slug", e.target.value);
  }

  const slugMudouEmPostPublicado = post?.status === "published" && valores.slug !== post.slug;

  function bloqueadoPorSlug(): boolean {
    if (slugMudouEmPostPublicado && !confirmaSlug) {
      setErro("Marque a confirmação abaixo antes de salvar a mudança de slug.");
      return true;
    }
    return false;
  }

  async function salvarRascunho() {
    setErro(null);
    setMensagem(null);
    if (bloqueadoPorSlug()) return;

    setEnviando("rascunho");
    const resultado = await salvarPost({ ...valores, id: post?.id });
    setEnviando(null);

    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível salvar o artigo.");
      return;
    }
    if (!post && resultado.id) {
      router.replace(`/admin/posts/${resultado.id}`);
      return;
    }
    router.refresh();
    setMensagem("Rascunho salvo.");
  }

  async function publicar() {
    setErro(null);
    setMensagem(null);
    if (bloqueadoPorSlug()) return;

    setEnviando("publicar");
    const resultadoSalvar = await salvarPost({ ...valores, id: post?.id });
    if (!resultadoSalvar.sucesso || !resultadoSalvar.id) {
      setEnviando(null);
      setErro(resultadoSalvar.erro ?? "Não foi possível salvar antes de publicar.");
      return;
    }

    const resultadoPublicar = await publicarPost(resultadoSalvar.id, valores.slug);
    setEnviando(null);
    if (!resultadoPublicar.sucesso) {
      setErro(resultadoPublicar.erro ?? "Não foi possível publicar o artigo.");
      return;
    }
    if (!post) {
      router.replace(`/admin/posts/${resultadoSalvar.id}`);
      return;
    }
    router.refresh();
    setMensagem("Publicado.");
  }

  async function despublicar() {
    if (!post) return;
    setErro(null);
    setMensagem(null);
    setEnviando("despublicar");
    const resultado = await despublicarPost(post.id, post.slug);
    setEnviando(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível despublicar o artigo.");
      return;
    }
    router.refresh();
    setMensagem("Despublicado — voltou para rascunho.");
  }

  async function excluir() {
    if (!post) return;
    if (!confirm(`Excluir "${post.title}"? Essa ação não pode ser desfeita.`)) return;
    setErro(null);
    setEnviando("excluir");
    const resultado = await excluirPost(post.id, post.slug);
    setEnviando(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível excluir o artigo.");
      return;
    }
    router.push("/admin/posts");
  }

  async function aoSelecionarCapa(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setEnviando("capa");
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const resultado = await uploadCapa(formData);
    setEnviando(null);
    if (!resultado.sucesso || !resultado.url) {
      setErro(resultado.erro ?? "Não foi possível enviar a imagem.");
      return;
    }
    setValor("cover_image", resultado.url);
  }

  return (
    <div>
      <Link href="/admin/posts" className="mb-4 inline-block text-sm text-neutral-500 hover:text-[var(--abissal)]">
        ← Voltar para artigos
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <label className={LABEL} htmlFor="title">
            Título
          </label>
          <input id="title" value={valores.title} onChange={aoMudarTitulo} className={CAMPO} />

          <label className={LABEL} htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            value={valores.slug}
            onChange={aoMudarSlug}
            className={`${CAMPO} font-mono`}
          />
          {slugMudouEmPostPublicado ? (
            <div className="-mt-2 mb-4 rounded-md border border-[var(--erro)]/30 bg-red-50 p-3 text-sm text-[var(--erro)]">
              <p className="mb-2">
                ⚠ Este post está publicado em <code>/blog/{post!.slug}/</code>. Mudar o slug quebra
                essa URL indexada (SEO) — você precisará adicionar um redirect 301 manualmente em{" "}
                <code>next.config.ts</code>.
              </p>
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={confirmaSlug}
                  onChange={(e) => setConfirmaSlug(e.target.checked)}
                />
                Entendo que isso quebra a URL indexada e quero mudar assim mesmo.
              </label>
            </div>
          ) : null}

          <label className={LABEL} htmlFor="excerpt">
            Resumo
          </label>
          <textarea
            id="excerpt"
            rows={2}
            value={valores.excerpt}
            onChange={(e) => setValor("excerpt", e.target.value)}
            className={CAMPO}
          />

          <label className={LABEL}>Conteúdo (Markdown)</label>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAba("editar")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                aba === "editar" ? "bg-[var(--abissal)] text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setAba("preview")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                aba === "preview" ? "bg-[var(--abissal)] text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              Preview
            </button>
          </div>

          {aba === "editar" ? (
            <textarea
              id="content"
              rows={20}
              value={valores.content}
              onChange={(e) => setValor("content", e.target.value)}
              className={`${CAMPO} font-mono text-[13px] leading-relaxed`}
            />
          ) : (
            <div className="mb-4 rounded-md border border-neutral-300 p-4">
              <div
                className="max-w-none text-sm leading-relaxed text-[var(--tinta)] [&_a]:text-[var(--jade)] [&_a]:underline [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-black/10 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {valores.content || "_Nada para pré-visualizar ainda._"}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <label className={LABEL} htmlFor="seo_title">
            SEO — título
          </label>
          <input
            id="seo_title"
            value={valores.seo_title}
            onChange={(e) => setValor("seo_title", e.target.value)}
            className={CAMPO}
          />

          <label className={LABEL} htmlFor="seo_description">
            SEO — descrição
          </label>
          <textarea
            id="seo_description"
            rows={2}
            value={valores.seo_description}
            onChange={(e) => setValor("seo_description", e.target.value)}
            className={CAMPO}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="category_id">
            Categoria
          </label>
          <select
            id="category_id"
            value={valores.category_id}
            onChange={(e) => setValor("category_id", e.target.value)}
            className={CAMPO}
          >
            <option value="" disabled>
              Selecione
            </option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name}
              </option>
            ))}
          </select>

          <label className={LABEL} htmlFor="cover_image">
            Imagem de capa
          </label>
          {valores.cover_image ? (
            <img src={valores.cover_image} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
          ) : null}
          <input
            id="cover_image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={aoSelecionarCapa}
            disabled={enviando === "capa"}
            className="mb-4 block w-full text-sm"
          />

          <label className={LABEL} htmlFor="rotulo">
            Rótulo do card
          </label>
          <input
            id="rotulo"
            value={valores.rotulo}
            onChange={(e) => setValor("rotulo", e.target.value)}
            className={CAMPO}
          />

          <label className={LABEL} htmlFor="cta_pagina">
            Página do CTA
          </label>
          <input
            id="cta_pagina"
            placeholder="/financiamento/#simulador"
            value={valores.cta_pagina}
            onChange={(e) => setValor("cta_pagina", e.target.value)}
            className={CAMPO}
          />

          {post ? (
            <div className="mb-4 text-xs text-neutral-500">
              Status atual: <span className="font-medium">{post.status}</span>
            </div>
          ) : null}
        </div>
      </div>

      {erro ? <p className="mb-3 text-sm text-[var(--erro)]">{erro}</p> : null}
      {mensagem ? <p className="mb-3 text-sm text-[var(--jade)]">{mensagem}</p> : null}

      <div className="flex flex-wrap gap-3 border-t border-black/10 pt-4">
        <button
          type="button"
          disabled={enviando !== null}
          onClick={salvarRascunho}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-[var(--abissal)] transition hover:border-[var(--abissal)] disabled:opacity-50"
        >
          {enviando === "rascunho" ? "Salvando…" : "Salvar rascunho"}
        </button>
        <button
          type="button"
          disabled={enviando !== null}
          onClick={publicar}
          className="rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] disabled:opacity-50"
        >
          {enviando === "publicar" ? "Publicando…" : "Publicar"}
        </button>
        {post?.status === "published" ? (
          <button
            type="button"
            disabled={enviando !== null}
            onClick={despublicar}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-500 disabled:opacity-50"
          >
            {enviando === "despublicar" ? "Despublicando…" : "Despublicar"}
          </button>
        ) : null}
        {post ? (
          <button
            type="button"
            disabled={enviando !== null}
            onClick={excluir}
            className="ml-auto rounded-md px-4 py-2 text-sm font-semibold text-[var(--erro)] transition hover:bg-red-50 disabled:opacity-50"
          >
            {enviando === "excluir" ? "Excluindo…" : "Excluir"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
