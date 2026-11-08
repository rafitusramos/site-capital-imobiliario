"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { BarraLista, CabecalhoOrdenavel } from "@/components/admin/ControlesLista";
import { alternarOrdenacao, consultarLista, type ConfigLista, type ConsultaLista } from "@/lib/admin/listas";
import { useToast } from "@/lib/admin/toast";
import { despublicarImovel, excluirImovel, publicarImovel } from "@/app/actions/admin-imoveis";
import type { ImovelAdminResumo } from "@/lib/queries/admin-imoveis";
import { formatarFase, formatarTipo } from "@/lib/imoveis/formato";
import { rotuloModalidade } from "@/lib/imoveis/ficha";
import type { ImovelModalidade } from "@/types/database";

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

type AcaoPendente = { tipo: "publicar" | "despublicar" | "excluir"; imovel: Imovel };

const VERBO = { publicar: "publicar", despublicar: "despublicar", excluir: "excluir" } as const;

const MENSAGEM_OK = {
  publicar: "Empreendimento publicado.",
  despublicar: "Empreendimento despublicado — voltou para rascunho.",
  excluir: "Empreendimento excluído.",
} as const;

const TEXTOS_CONFIRMACAO = {
  publicar: {
    titulo: "Publicar empreendimento?",
    rotulo: "Publicar",
    descricao: (nome: string) => `"${nome}" passa a aparecer no site público.`,
  },
  despublicar: {
    titulo: "Despublicar empreendimento?",
    rotulo: "Despublicar",
    descricao: (nome: string) => `"${nome}" sai do site público e volta para rascunho.`,
  },
  excluir: {
    titulo: "Excluir empreendimento?",
    rotulo: "Excluir",
    descricao: (nome: string) => `"${nome}" será excluído e a URL deixa de existir. Essa ação não pode ser desfeita.`,
  },
} as const;

const OPCOES_STATUS = [
  { valor: "ativo", rotulo: STATUS_LABEL.ativo },
  { valor: "reservado", rotulo: STATUS_LABEL.reservado },
  { valor: "vendido", rotulo: STATUS_LABEL.vendido },
  { valor: "inativo", rotulo: STATUS_LABEL.inativo },
];

const CONFIG_LISTA: ConfigLista<Imovel> = {
  textos: (i) => [i.titulo, i.slug],
  status: (i) => i.status,
  ordenadores: {
    titulo: (i) => i.titulo,
    cidade: (i) => i.cidade,
    fase: (i) => i.fase?.ordem ?? null,
  },
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSE[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function TabelaImoveis({ imoveis }: { imoveis: Imovel[] }) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [acao, setAcao] = useState<AcaoPendente | null>(null);
  const [consulta, setConsulta] = useState<ConsultaLista>({ busca: "", status: "todos", ordem: null });
  const [modalidade, setModalidade] = useState<"todas" | ImovelModalidade>("todas");

  const visiveis = useMemo(
    () =>
      consultarLista(
        modalidade === "todas" ? imoveis : imoveis.filter((i) => i.modalidade === modalidade),
        consulta,
        CONFIG_LISTA,
      ),
    [imoveis, consulta, modalidade],
  );

  async function executar(tipo: AcaoPendente["tipo"], imovel: Imovel) {
    setAcao(null);
    setPendenteId(imovel.id);
    const resultado =
      tipo === "publicar"
        ? await publicarImovel(imovel.id, imovel.slug)
        : tipo === "despublicar"
          ? await despublicarImovel(imovel.id, imovel.slug)
          : await excluirImovel(imovel.id, imovel.slug);
    setPendenteId(null);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? `Não foi possível ${VERBO[tipo]} o empreendimento.`);
      return;
    }
    mostrarToast("sucesso", MENSAGEM_OK[tipo]);
    router.refresh();
  }

  function ordenar(coluna: string) {
    setConsulta((c) => ({ ...c, ordem: alternarOrdenacao(c.ordem, coluna) }));
  }

  if (imoveis.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum imóvel ainda.</p>;
  }

  const textos = acao ? TEXTOS_CONFIRMACAO[acao.tipo] : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2" role="group" aria-label="Filtrar por modalidade">
        {(["todas", "lancamento", "pronto"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={modalidade === opcao}
            onClick={() => setModalidade(opcao)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              modalidade === opcao
                ? "border-[var(--jade)] bg-[var(--jade)] text-white"
                : "border-neutral-300 text-neutral-600 hover:border-[var(--abissal)]"
            }`}
          >
            {opcao === "todas" ? "Todos" : opcao === "pronto" ? "Imóveis prontos" : "Lançamentos"}
          </button>
        ))}
      </div>

      <BarraLista
        rotuloBusca="Buscar imóvel"
        placeholderBusca="Nome ou slug"
        busca={consulta.busca}
        onBusca={(busca) => setConsulta((c) => ({ ...c, busca }))}
        status={consulta.status}
        onStatus={(status) => setConsulta((c) => ({ ...c, status }))}
        opcoesStatus={OPCOES_STATUS}
        total={imoveis.length}
        exibidos={visiveis.length}
      />

      <div className="rounded-lg border border-black/10 bg-white">
        <div className={`hidden border-b border-black/10 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500 ${GRADE}`}>
          <CabecalhoOrdenavel coluna="titulo" rotulo="Empreendimento" ordem={consulta.ordem} onOrdenar={ordenar} />
          <CabecalhoOrdenavel coluna="cidade" rotulo="Cidade" ordem={consulta.ordem} onOrdenar={ordenar} />
          <span>Tipo</span>
          <CabecalhoOrdenavel coluna="fase" rotulo="Fase" ordem={consulta.ordem} onOrdenar={ordenar} />
          <span>Status</span>
          <span>Ações</span>
        </div>

        {visiveis.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            Nenhum empreendimento encontrado com esses filtros.
          </p>
        ) : (
          <ul role="list" className="divide-y divide-black/5">
            {visiveis.map((imovel) => (
              <li key={imovel.id} className={`flex flex-col gap-2 p-4 text-sm sm:px-4 sm:py-3 ${GRADE}`}>
                <div className="min-w-0">
                  <span className="font-medium text-[var(--abissal)]">{imovel.titulo}</span>
                  <span className="ml-2 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    {rotuloModalidade(imovel.modalidade)}
                  </span>
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
                    aria-label={`Editar empreendimento "${imovel.titulo}"`}
                    className={`${ICONE_CLASSE} text-[var(--jade)]`}
                  >
                    <IconeEditar />
                  </Link>
                  {imovel.status === "ativo" ? (
                    <button
                      type="button"
                      title="Despublicar"
                      aria-label={`Despublicar empreendimento "${imovel.titulo}"`}
                      disabled={pendenteId === imovel.id}
                      onClick={() => setAcao({ tipo: "despublicar", imovel })}
                      className={`${ICONE_CLASSE} text-neutral-600`}
                    >
                      <IconeOlhoFechado />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Publicar"
                      aria-label={`Publicar empreendimento "${imovel.titulo}"`}
                      disabled={pendenteId === imovel.id}
                      onClick={() => setAcao({ tipo: "publicar", imovel })}
                      className={`${ICONE_CLASSE} text-[var(--jade)]`}
                    >
                      <IconeOlho />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Excluir"
                    aria-label={`Excluir empreendimento "${imovel.titulo}"`}
                    disabled={pendenteId === imovel.id}
                    onClick={() => setAcao({ tipo: "excluir", imovel })}
                    className={`${ICONE_CLASSE} text-[var(--erro)]`}
                  >
                    <IconeLixeira />
                  </button>
                  {imovel.status === "ativo" ? (
                    <a
                      href={`/imoveis/${imovel.slug}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no site"
                      aria-label={`Abrir empreendimento "${imovel.titulo}" no site (nova aba)`}
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
        descricao={acao && textos ? textos.descricao(acao.imovel.titulo) : ""}
        rotuloConfirmar={textos?.rotulo}
        variante={acao?.tipo === "excluir" ? "perigo" : "padrao"}
        onConfirmar={() => acao && executar(acao.tipo, acao.imovel)}
        onCancelar={() => setAcao(null)}
      />
    </div>
  );
}
