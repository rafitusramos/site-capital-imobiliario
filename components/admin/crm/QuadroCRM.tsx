"use client";

import { useEffect, useMemo, useReducer, useRef, useState, useTransition, useOptimistic } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { etapasDoTipo, etapaPorSlug } from "@/lib/crm/etapas";
import { aplicarFiltros, ordenarLeads } from "@/lib/crm/filtros";
import { filtrosAtivos, filtrosDaQuery, filtrosParaQuery } from "@/lib/crm/filtros-url";
import { csvDoQuadro } from "@/lib/crm/csv";
import { moverLead, arquivarLead, alternarFavorito } from "@/app/actions/admin-crm";
import { useToast } from "@/lib/admin/toast";
import type { ContagemEtapaCRM, DominiosCRM, LeadQuadroCRM } from "@/lib/queries/admin-crm";
import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";
import { ColunaEtapa } from "@/components/admin/crm/ColunaEtapa";
import { CardLead, type TagCatalogo } from "@/components/admin/crm/CardLead";
import { BarraFiltros, reducerFiltros } from "@/components/admin/crm/BarraFiltros";
import { DialogoMotivo, type MotivoOpcao } from "@/components/admin/crm/DialogoMotivo";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { EstadoVazio } from "@/components/admin/crm/EstadoVazio";
import { ModalLead } from "@/components/admin/crm/ModalLead";
import { NovoLeadModal } from "@/components/admin/crm/NovoLeadModal";

export type QuadroCRMProps = {
  tipo: LeadTipoSlug;
  leadsIniciais: LeadQuadroCRM[];
  contagensPorEtapa: ContagemEtapaCRM[];
  dominios: DominiosCRM;
  /** Gancho do modal de edição (docs/crm-spec.md §1.4): id lido de `?lead=<id>` em `[origem]/page.tsx`. */
  leadAbertoId?: string;
  /** `?novo=1` (docs/crm-spec.md §1.4) — o atalho "n" abaixo já navega para lá. */
  novoAberto?: boolean;
  /** Mostra o "Exportar CSV". Só decide a visibilidade: quem pode ver os leads já é a RLS (docs/crm-spec.md §3.2). */
  souAdmin?: boolean;
};

type AcaoOtimista =
  | { tipo: "mover"; leadId: string; novaEtapa: LeadEtapaSlug }
  | { tipo: "favoritar"; leadId: string; favorito: boolean };

/** Reducer otimista (docs/crm-spec.md §3.2): troca só a etapa ou só o favorito do lead local, nada mais. */
function reducerOtimista(estado: LeadQuadroCRM[], acao: AcaoOtimista): LeadQuadroCRM[] {
  return estado.map((lead) => {
    if (lead.id !== acao.leadId) return lead;
    return acao.tipo === "mover" ? { ...lead, status: acao.novaEtapa } : { ...lead, favorito: acao.favorito };
  });
}

/** Dia de hoje em São Paulo (AAAA-MM-DD) para o nome do arquivo exportado. */
function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Comparação de query ignorando a ordem dos parâmetros. */
function mesmaQuery(a: URLSearchParams, b: URLSearchParams): boolean {
  const ordenar = (p: URLSearchParams) => {
    const c = new URLSearchParams(p);
    c.sort();
    return c.toString();
  };
  return ordenar(a) === ordenar(b);
}

function alvoEditavel(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || alvo.isContentEditable;
}

/** pointerWithin primeiro, rectIntersection de reserva (docs/crm-spec.md §3.3): closestCenter erra com colunas altas de tamanhos desiguais. */
const detectarColisao: CollisionDetection = (args) => {
  const porPonteiro = pointerWithin(args);
  if (porPonteiro.length > 0) return porPonteiro;
  return rectIntersection(args);
};

/**
 * Quadro do CRM (docs/crm-spec.md §3.1–§3.3). Client component: `DndContext`
 * para o arrastar, `useReducer` para o estado de filtro/ordenação (via
 * BarraFiltros.tsx) e `useOptimistic` para o movimento do card — o servidor
 * confirma via `moverLead`, e o `useOptimistic` reverte sozinho para
 * `leadsIniciais` sempre que a transição termina sem uma mutação real ter
 * acontecido (falha, ou diálogo de motivo cancelado).
 */
export function QuadroCRM({ tipo, leadsIniciais, contagensPorEtapa, dominios, leadAbertoId, novoAberto, souAdmin = false }: QuadroCRMProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mostrarToast } = useToast();

  const etapas = useMemo(() => etapasDoTipo(tipo), [tipo]);

  const [leadsOtimista, aplicarOtimista] = useOptimistic(leadsIniciais, reducerOtimista);
  const [, startTransition] = useTransition();

  // Filtros vivem na URL (docs/crm-spec.md §3.2): o estado nasce dela e o
  // efeito abaixo a mantem em dia. Recarregar ou compartilhar o link
  // reproduz a visao; a aba de origem leva os filtros junto (AbasOrigem.tsx).
  const [filtros, dispatchFiltros] = useReducer(reducerFiltros, searchParams, filtrosDaQuery);
  useEffect(() => {
    const atual = new URLSearchParams(window.location.search);
    const desejada = filtrosParaQuery(atual, filtros);
    if (mesmaQuery(atual, desejada)) return;
    const query = desejada.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [filtros, pathname]);

  /** URL desta aba com os filtros atuais e, opcionalmente, `?lead=`/`?novo=1`: abrir/fechar modal não pode perder a visão filtrada. */
  function urlComFiltros(extras: Record<string, string> = {}): string {
    const params = filtrosParaQuery(new URLSearchParams(), filtros);
    for (const [chave, valor] of Object.entries(extras)) params.set(chave, valor);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  // Arrasto desligado abaixo de 768px (docs/crm-spec.md §3.3 e regras do
  // escopo): default `true` para bater com a primeira renderização do
  // servidor (que não sabe a largura da viewport) — mesma técnica de
  // detecção pós-mount que components/admin/GaleriaImovel.tsx usa para
  // prefers-reduced-motion.
  const [arrastavel, setArrastavel] = useState(true);
  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 768px)");
    setArrastavel(consulta.matches);
    function aoMudar(e: MediaQueryListEvent) {
      setArrastavel(e.matches);
    }
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  const [idAtivo, setIdAtivo] = useState<string | null>(null);
  const [dialogoMotivo, setDialogoMotivo] = useState<{
    etapaLabel: string;
    resolver: (dados: { motivo: string; motivoObs?: string } | null) => void;
  } | null>(null);
  const [confirmarArquivar, setConfirmarArquivar] = useState<string | null>(null);
  const [arquivando, setArquivando] = useState(false);

  const refBusca = useRef<HTMLInputElement>(null);

  // Atalhos (docs/crm-spec.md §4): "/" foca a busca, "n" navega para
  // ?novo=1 (criação manual — fora deste escopo, só o gancho de navegação).
  // "Esc" é tratado dentro de cada diálogo, não aqui, para não disparar duas
  // vezes quando um deles está aberto.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      // Também não dispara com um modal aberto (ModalLead/NovoLeadModal já
      // têm o próprio foco preso — "n" pressionado num botão do modal, fora
      // de um campo, não pode abrir um SEGUNDO modal por cima).
      if (alvoEditavel(e.target) || dialogoMotivo || confirmarArquivar !== null || leadAbertoId || novoAberto) return;
      if (e.key === "/") {
        e.preventDefault();
        refBusca.current?.focus();
      } else if (e.key === "n") {
        e.preventDefault();
        router.push(urlComFiltros({ novo: "1" }));
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- urlComFiltros so le `filtros`/`pathname`, ja listados; ela e recriada a cada render e listar a funcao reataria o listener sem necessidade.
  }, [router, pathname, filtros, dialogoMotivo, confirmarArquivar, leadAbertoId, novoAberto]);

  const tagsCatalogo = useMemo<Record<string, TagCatalogo>>(() => {
    const mapa: Record<string, TagCatalogo> = {};
    for (const tag of dominios.tags) mapa[tag.slug] = { label: tag.label, cor: tag.cor };
    return mapa;
  }, [dominios.tags]);

  const motivos: MotivoOpcao[] = useMemo(
    () => dominios.motivosPerda.map((m) => ({ slug: m.slug, label: m.label })),
    [dominios.motivosPerda],
  );

  const filtroAtivo = filtrosAtivos(filtros);

  const leadsFiltrados = useMemo(() => aplicarFiltros(leadsOtimista, filtros), [leadsOtimista, filtros]);

  const colunas = useMemo(
    () =>
      etapas.map((etapa) => {
        const daEtapa = leadsFiltrados.filter((l) => l.status === etapa.slug);
        return { etapa, leads: ordenarLeads(daEtapa, filtros.ordenacao) };
      }),
    [etapas, leadsFiltrados, filtros.ordenacao],
  );

  const contagensPorSlug = useMemo(() => {
    const mapa = new Map<LeadEtapaSlug, ContagemEtapaCRM>();
    for (const c of contagensPorEtapa) mapa.set(c.etapa, c);
    return mapa;
  }, [contagensPorEtapa]);

  const leadAtivo = idAtivo ? (leadsOtimista.find((l) => l.id === idAtivo) ?? null) : null;

  /**
   * Move um lead de etapa (docs/crm-spec.md §1.4, §3.3, §5 casos 1–3). Uma
   * única transição cobre: aplicar o movimento otimista, esperar o diálogo de
   * motivo quando a etapa exige (a Promise só resolve quando o operador
   * confirma ou cancela — o `useOptimistic` mantém o card na nova coluna
   * durante toda essa espera, porque a transição continua pendente), chamar
   * `moverLead`, e mostrar o toast. Cancelar o diálogo, ou o servidor
   * recusar, faz a transição terminar sem confirmar nada: o `useOptimistic`
   * devolve o card para `leadsIniciais` — a coluna de origem — sozinho.
   */
  function mover(leadId: string, novaEtapa: LeadEtapaSlug) {
    const lead = leadsIniciais.find((l) => l.id === leadId);
    if (!lead || lead.status === novaEtapa) return; // caso de borda 1: soltar na mesma coluna é no-op

    const etapaAlvo = etapaPorSlug(tipo, novaEtapa);
    if (!etapaAlvo) return; // não deveria acontecer: over.id sempre vem de uma coluna deste pipeline

    startTransition(async () => {
      aplicarOtimista({ tipo: "mover", leadId, novaEtapa });

      let dadosMotivo: { motivo: string; motivoObs?: string } | null = null;
      if (etapaAlvo.exigeMotivo) {
        dadosMotivo = await new Promise((resolve) => {
          setDialogoMotivo({ etapaLabel: etapaAlvo.label, resolver: resolve });
        });
        setDialogoMotivo(null);
        if (!dadosMotivo) return; // caso de borda 2: cancelado, nada é gravado
      }

      const resultado = await moverLead({
        leadId,
        etapa: novaEtapa,
        motivo: dadosMotivo?.motivo,
        motivoObs: dadosMotivo?.motivoObs,
        updatedAt: lead.updated_at,
      });

      if (!resultado.sucesso) {
        mostrarToast("erro", resultado.erro ?? "Não foi possível mover o lead.");
        return;
      }
      mostrarToast("sucesso", `Lead movido para ${etapaAlvo.label}.`);
    });
  }

  function aoIniciarArraste(evento: DragStartEvent) {
    setIdAtivo(String(evento.active.id));
  }

  function aoTerminarArraste(evento: DragEndEvent) {
    setIdAtivo(null);
    const { active, over } = evento;
    if (!over) return;
    mover(String(active.id), over.id as LeadEtapaSlug);
  }

  const sensores = useSensors(
    // distance: 6 — sem isso, clicar no botão de editar (que fica sobre o
    // card) vira início de arraste (docs/crm-spec.md §3.3).
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function editar(id: string) {
    router.push(urlComFiltros({ lead: id }));
  }

  /** Fecha ModalLead/NovoLeadModal limpando `?lead=`/`?novo=1` da URL (docs/crm-spec.md §1.4). */
  function fecharModal() {
    router.push(urlComFiltros());
  }

  async function confirmarArquivamento() {
    if (!confirmarArquivar) return;
    setArquivando(true);
    const resultado = await arquivarLead(confirmarArquivar);
    setArquivando(false);
    setConfirmarArquivar(null);
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível arquivar o lead.");
      return;
    }
    mostrarToast("sucesso", "Lead arquivado.");
  }

  /**
   * Favoritar otimista, no mesmo molde do `mover`: a estrela vira na hora; se
   * a action falhar, a transição termina sem confirmar nada e o
   * `useOptimistic` devolve o valor do servidor, e o toast explica o porquê.
   */
  function favoritar(id: string) {
    const lead = leadsOtimista.find((l) => l.id === id);
    if (!lead) return;
    startTransition(async () => {
      aplicarOtimista({ tipo: "favoritar", leadId: id, favorito: !lead.favorito });
      const resultado = await alternarFavorito(id);
      if (!resultado.sucesso) {
        mostrarToast("erro", resultado.erro ?? "Não foi possível atualizar o favorito.");
      }
    });
  }

  /**
   * Exporta o que está na tela (filtros + ordem), no navegador: as linhas já
   * estão carregadas e quem as vê já passou pela RLS, então uma ida ao
   * servidor só reimplementaria os filtros. O botão só existe para admin
   * (`souAdmin`); é conforto de interface, não barreira de dados.
   */
  function exportarCsv() {
    const linhas = ordenarLeads(leadsFiltrados, filtros.ordenacao);
    const blob = new Blob([csvDoQuadro(linhas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${tipo}-${hojeEmSaoPaulo()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    mostrarToast("sucesso", `${linhas.length} lead(s) exportado(s).`);
  }

  return (
    <div>
      <BarraFiltros
        ref={refBusca}
        filtros={filtros}
        dispatch={dispatchFiltros}
        corretores={dominios.corretores.map((c) => ({ id: c.id, full_name: c.full_name }))}
        tags={dominios.tags}
        onExportar={souAdmin ? exportarCsv : undefined}
        totalVisivel={leadsFiltrados.length}
      />

      {/* Quadro sem nenhum lead: a mensagem aparece ACIMA das colunas, sem
          escondê-las. Antes ela substituía filtros e colunas, e quem abria a
          aba Consórcio (nasce vazia) ficava sem a barra de filtros e sem ver o
          pipeline que o primeiro lead vai percorrer. */}
      {leadsIniciais.length === 0 ? (
        <div className="mb-4">
          <EstadoVazio
            variante="coluna"
            mensagem="Nenhum lead nesta origem ainda. Crie um lead manualmente para começar."
          />
        </div>
      ) : null}

      {/* `id` explícito não é enfeite: sem ele o dnd-kit deriva o
          `aria-describedby` dos cards de um CONTADOR DE MÓDULO
          (`useUniqueId` em @dnd-kit/utilities), não do `useId` do React. O
          módulo fica em cache entre requisições no servidor, enquanto no
          cliente o contador nasce do zero e ainda é renderizado duas vezes
          pelo StrictMode em desenvolvimento — os dois lados chegam a números
          diferentes e o React acusa erro de hidratação. Com um id fixo, o
          atributo é o mesmo nas duas pontas. Só existe um quadro montado por
          vez, então o valor pode ser constante. */}
      <DndContext
        id="crm-quadro"
        sensors={sensores}
        collisionDetection={detectarColisao}
        onDragStart={aoIniciarArraste}
        onDragEnd={aoTerminarArraste}
        onDragCancel={() => setIdAtivo(null)}
      >
        {/* w-full: prende este container à largura disponível do `main`
            (agora com min-w-0 em app/admin/(protected)/layout.tsx) — é ele
            quem deve rolar na horizontal, não a página inteira. */}
        <div className="flex w-full gap-4 overflow-x-auto pb-4">
          {colunas.map(({ etapa, leads }) => (
            <ColunaEtapa
              key={etapa.slug}
              etapa={etapa}
              leads={leads}
              contagemBase={contagensPorSlug.get(etapa.slug) ?? { total: 0, somaValorNegocio: 0 }}
              filtroAtivo={filtroAtivo}
              arrastavel={arrastavel}
              tagsCatalogo={tagsCatalogo}
              onEditar={editar}
              onArquivar={setConfirmarArquivar}
              onAlternarFavorito={favoritar}
            />
          ))}
        </div>

        <DragOverlay>
          {leadAtivo ? (
            <div className="w-[224px]">
              <CardLead
                lead={leadAtivo}
                arrastavel={false}
                fantasma
                tagsCatalogo={tagsCatalogo}
                onEditar={() => {}}
                onArquivar={() => {}}
                onAlternarFavorito={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DialogoMotivo
        estado={dialogoMotivo ? { etapaLabel: dialogoMotivo.etapaLabel } : null}
        motivos={motivos}
        onConfirmar={(dados) => dialogoMotivo?.resolver(dados)}
        onCancelar={() => dialogoMotivo?.resolver(null)}
      />

      <ConfirmarAcao
        aberto={confirmarArquivar !== null}
        titulo="Arquivar lead"
        descricao="O lead sai do quadro, mas o histórico é preservado. É possível restaurá-lo na tela de arquivados."
        rotuloConfirmar="Arquivar"
        variante="perigo"
        pendente={arquivando}
        onConfirmar={confirmarArquivamento}
        onCancelar={() => setConfirmarArquivar(null)}
      />

      {leadAbertoId ? <ModalLead key={leadAbertoId} leadId={leadAbertoId} dominios={dominios} onFechar={fecharModal} /> : null}
      {novoAberto ? <NovoLeadModal tipo={tipo} dominios={dominios} onFechar={fecharModal} /> : null}
    </div>
  );
}
