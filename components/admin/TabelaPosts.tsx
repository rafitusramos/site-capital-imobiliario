"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { BarraLista, CabecalhoOrdenavel } from "@/components/admin/ControlesLista";
import { alternarOrdenacao, consultarLista, type ConfigLista, type ConsultaLista } from "@/lib/admin/listas";
import { useToast } from "@/lib/admin/toast";
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

const GRADE = "sm:grid sm:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4";

type AcaoPendente = { tipo: "publicar" | "despublicar" | "excluir"; post: PostAdmin };

const VERBO = { publicar: "publicar", despublicar: "despublicar", excluir: "excluir" } as const;

const MENSAGEM_OK = {
  publicar: "Artigo publicado.",
  despublicar: "Artigo despublicado — voltou para rascunho.",
  excluir: "Artigo excluído.",
} as const;

const TEXTOS_CONFIRMACAO = {
  publicar: {
    titulo: "Publicar artigo?",
    rotulo: "Publicar",
    descricao: (nome: string) => `"${nome}" passa a aparecer no blog público.`,
  },
  despublicar: {
    titulo: "Despublicar artigo?",
    rotulo: "Despublicar",
    descricao: (nome: string) => `"${nome}" sai do blog público e volta para rascunho.`,
  },
  excluir: {
    titulo: "Excluir artigo?",
    rotulo: "Excluir",
    descricao: (nome: string) => `"${nome}" será excluído e a URL deixa de existir. Essa ação não pode ser desfeita.`,
  },
} as const;

const OPCOES_STATUS = [
  { valor: "draft", rotulo: "Rascunho" },
  { valor: "published", rotulo: "Publicado" },
];

const CONFIG_LISTA: ConfigLista<PostAdmin> = {
  textos: (p) => [p.title, p.slug],
  status: (p) => p.status,
  ordenadores: { titulo: (p) => p.title, publicado: (p) => p.published_at },
};

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

function IconeAbrir() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M11 3h6v6" />
      <path d="M17 3 9.5 10.5" />
      <path d="M15 11.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4.5" />
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

function IconeUsuario({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M3.5 17c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSE[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Autor({ autor }: { autor: PostAdmin["autor"] }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {autor?.avatar_url ? (
        <img src={autor.avatar_url} alt="" className="h-6 w-6 flex-none rounded-full object-cover" />
      ) : (
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
          <IconeUsuario className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="truncate text-neutral-600">{autor?.full_name ?? "—"}</span>
    </div>
  );
}

export function TabelaPosts({ posts }: { posts: PostAdmin[] }) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [acao, setAcao] = useState<AcaoPendente | null>(null);
  const [consulta, setConsulta] = useState<ConsultaLista>({ busca: "", status: "todos", ordem: null });

  const visiveis = useMemo(() => consultarLista(posts, consulta, CONFIG_LISTA), [posts, consulta]);

  async function executar(tipo: AcaoPendente["tipo"], post: PostAdmin) {
    setAcao(null);
    setPendenteId(post.id);
    const resultado =
      tipo === "publicar"
        ? await publicarPost(post.id, post.slug)
        : tipo === "despublicar"
          ? await despublicarPost(post.id, post.slug)
          : await excluirPost(post.id, post.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? `Não foi possível ${VERBO[tipo]} o artigo.`);
      return;
    }
    mostrarToast("sucesso", MENSAGEM_OK[tipo]);
    router.refresh();
  }

  function ordenar(coluna: string) {
    setConsulta((c) => ({ ...c, ordem: alternarOrdenacao(c.ordem, coluna) }));
  }

  if (posts.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum artigo ainda.</p>;
  }

  const textos = acao ? TEXTOS_CONFIRMACAO[acao.tipo] : null;

  return (
    <div>
      <BarraLista
        rotuloBusca="Buscar artigo"
        placeholderBusca="Título ou slug"
        busca={consulta.busca}
        onBusca={(busca) => setConsulta((c) => ({ ...c, busca }))}
        status={consulta.status}
        onStatus={(status) => setConsulta((c) => ({ ...c, status }))}
        opcoesStatus={OPCOES_STATUS}
        total={posts.length}
        exibidos={visiveis.length}
      />

      <div className="rounded-lg border border-black/10 bg-white">
        <div className={`hidden border-b border-black/10 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500 ${GRADE}`}>
          <CabecalhoOrdenavel coluna="titulo" rotulo="Título" ordem={consulta.ordem} onOrdenar={ordenar} />
          <span>Categoria</span>
          <span>Status</span>
          <span>Autor</span>
          <CabecalhoOrdenavel coluna="publicado" rotulo="Publicado em" ordem={consulta.ordem} onOrdenar={ordenar} />
          <span>Ações</span>
        </div>

        {visiveis.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            Nenhum artigo encontrado com esses filtros.
          </p>
        ) : (
          <ul role="list" className="divide-y divide-black/5">
            {visiveis.map((post) => (
              <li key={post.id} className={`flex flex-col gap-2 p-4 text-sm sm:px-4 sm:py-3 ${GRADE}`}>
                <div className="min-w-0">
                  <span className="font-medium text-[var(--abissal)]">{post.title}</span>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 sm:hidden">
                    <span>{post.categoria?.name ?? "—"}</span>
                    <span aria-hidden="true">·</span>
                    <StatusBadge status={post.status} />
                    <span aria-hidden="true">·</span>
                    <span>{post.published_at ? formatarData(post.published_at) : "—"}</span>
                  </div>
                </div>

                <span className="hidden text-base text-neutral-600 sm:block">{post.categoria?.name ?? "—"}</span>
                <span className="hidden sm:block">
                  <StatusBadge status={post.status} />
                </span>
                <div className="hidden sm:block">
                  <Autor autor={post.autor} />
                </div>
                <span className="hidden text-neutral-600 sm:block">
                  {post.published_at ? formatarData(post.published_at) : "—"}
                </span>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    title="Editar"
                    aria-label={`Editar artigo "${post.title}"`}
                    className={`${ICONE_CLASSE} text-[var(--jade)]`}
                  >
                    <IconeEditar />
                  </Link>
                  {post.status === "published" ? (
                    <button
                      type="button"
                      title="Despublicar"
                      aria-label={`Despublicar artigo "${post.title}"`}
                      disabled={pendenteId === post.id}
                      onClick={() => setAcao({ tipo: "despublicar", post })}
                      className={`${ICONE_CLASSE} text-neutral-600`}
                    >
                      <IconeOlhoFechado />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Publicar"
                      aria-label={`Publicar artigo "${post.title}"`}
                      disabled={pendenteId === post.id}
                      onClick={() => setAcao({ tipo: "publicar", post })}
                      className={`${ICONE_CLASSE} text-[var(--jade)]`}
                    >
                      <IconeOlho />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Excluir"
                    aria-label={`Excluir artigo "${post.title}"`}
                    disabled={pendenteId === post.id}
                    onClick={() => setAcao({ tipo: "excluir", post })}
                    className={`${ICONE_CLASSE} text-[var(--erro)]`}
                  >
                    <IconeLixeira />
                  </button>
                  {post.status === "published" ? (
                    <a
                      href={`/blog/${post.slug}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no site"
                      aria-label={`Abrir artigo "${post.title}" no site (nova aba)`}
                      className={`${ICONE_CLASSE} text-neutral-600`}
                    >
                      <IconeAbrir />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmarAcao
        aberto={acao !== null}
        titulo={textos?.titulo ?? ""}
        descricao={acao && textos ? textos.descricao(acao.post.title) : ""}
        rotuloConfirmar={textos?.rotulo}
        variante={acao?.tipo === "excluir" ? "perigo" : "padrao"}
        onConfirmar={() => acao && executar(acao.tipo, acao.post)}
        onCancelar={() => setAcao(null)}
      />
    </div>
  );
}
