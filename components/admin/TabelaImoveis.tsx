"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { despublicarImovel, excluirImovel, publicarImovel } from "@/app/actions/admin-imoveis";
import type { ImovelAdminResumo } from "@/lib/queries/admin-imoveis";
import { formatarFase, formatarTipo } from "@/lib/imoveis/formato";

type Imovel = ImovelAdminResumo;

const STATUS_LABEL: Record<string, string> = {
  ativo: "Publicado",
  inativo: "Rascunho",
  reservado: "Reservado",
  vendido: "Vendido",
};

const STATUS_CLASSE: Record<string, string> = {
  ativo: "bg-[var(--jade)]/10 text-[var(--jade)]",
  inativo: "bg-neutral-100 text-neutral-600",
  reservado: "bg-amber-100 text-amber-700",
  vendido: "bg-neutral-200 text-neutral-500",
};

const ICONE_CLASSE =
  "inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent";

const GRADE = "sm:grid sm:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4";

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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSE[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function TabelaImoveis({ imoveis }: { imoveis: Imovel[] }) {
  const router = useRouter();
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function aoPublicar(imovel: Imovel) {
    setErro(null);
    setPendenteId(imovel.id);
    const resultado = await publicarImovel(imovel.id, imovel.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível publicar o empreendimento.");
      return;
    }
    router.refresh();
  }

  async function aoDespublicar(imovel: Imovel) {
    setErro(null);
    setPendenteId(imovel.id);
    const resultado = await despublicarImovel(imovel.id, imovel.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível despublicar o empreendimento.");
      return;
    }
    router.refresh();
  }

  async function aoExcluir(imovel: Imovel) {
    if (!confirm(`Excluir "${imovel.titulo}"? Essa ação não pode ser desfeita.`)) return;
    setErro(null);
    setPendenteId(imovel.id);
    const resultado = await excluirImovel(imovel.id, imovel.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível excluir o empreendimento.");
      return;
    }
    router.refresh();
  }

  if (imoveis.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum empreendimento ainda.</p>;
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white">
      {erro ? (
        <p className="border-b border-black/10 bg-red-50 px-4 py-2 text-sm text-[var(--erro)]">{erro}</p>
      ) : null}

      <div className={`hidden border-b border-black/10 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500 ${GRADE}`}>
        <span>Empreendimento</span>
        <span>Cidade</span>
        <span>Tipo</span>
        <span>Fase</span>
        <span>Status</span>
        <span>Ações</span>
      </div>

      <ul role="list" className="divide-y divide-black/5">
        {imoveis.map((imovel) => (
          <li key={imovel.id} className={`flex flex-col gap-2 p-4 text-sm sm:px-4 sm:py-3 ${GRADE}`}>
            <div className="min-w-0">
              <span className="font-medium text-[var(--abissal)]">{imovel.titulo}</span>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 sm:hidden">
                <span>{imovel.cidade ?? "—"}</span>
                <span aria-hidden="true">·</span>
                <span>{formatarTipo(imovel.tipo)}</span>
                <span aria-hidden="true">·</span>
                <StatusBadge status={imovel.status} />
              </div>
            </div>

            <span className="hidden text-neutral-600 sm:block">{imovel.cidade ?? "—"}</span>
            <span className="hidden text-neutral-600 sm:block">{formatarTipo(imovel.tipo)}</span>
            <span className="hidden text-neutral-600 sm:block">{formatarFase(imovel.fase)}</span>
            <span className="hidden sm:block">
              <StatusBadge status={imovel.status} />
            </span>

            <div className="flex items-center gap-1">
              <Link
                href={`/admin/imoveis/${imovel.id}`}
                title="Editar"
                aria-label="Editar"
                className={`${ICONE_CLASSE} text-[var(--jade)]`}
              >
                <IconeEditar />
              </Link>
              {imovel.status === "ativo" ? (
                <button
                  type="button"
                  title="Despublicar"
                  aria-label="Despublicar"
                  disabled={pendenteId === imovel.id}
                  onClick={() => aoDespublicar(imovel)}
                  className={`${ICONE_CLASSE} text-neutral-600`}
                >
                  <IconeOlhoFechado />
                </button>
              ) : (
                <button
                  type="button"
                  title="Publicar"
                  aria-label="Publicar"
                  disabled={pendenteId === imovel.id}
                  onClick={() => aoPublicar(imovel)}
                  className={`${ICONE_CLASSE} text-[var(--jade)]`}
                >
                  <IconeOlho />
                </button>
              )}
              <button
                type="button"
                title="Excluir"
                aria-label="Excluir"
                disabled={pendenteId === imovel.id}
                onClick={() => aoExcluir(imovel)}
                className={`${ICONE_CLASSE} text-[var(--erro)]`}
              >
                <IconeLixeira />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
