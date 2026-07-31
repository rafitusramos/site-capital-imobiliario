"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { carregarDetalheLead, type DetalheLeadCarregado } from "@/components/admin/crm/carregar-lead";
import { moverLead, type AcaoResultado } from "@/app/actions/admin-crm";
import { etapaPorSlug } from "@/lib/crm/etapas";
import { useToast } from "@/lib/admin/toast";
import { IconeFechar } from "@/components/admin/crm/icones";
import { PainelComum } from "@/components/admin/crm/PainelComum";
import { PainelOrigem } from "@/components/admin/crm/PainelOrigem";
import { LinhaDoTempo } from "@/components/admin/crm/LinhaDoTempo";
import { NovaInteracao } from "@/components/admin/crm/NovaInteracao";
import { ListaLembretes } from "@/components/admin/crm/ListaLembretes";
import { DialogoMotivo, type MotivoOpcao } from "@/components/admin/crm/DialogoMotivo";
import type { DominiosCRM } from "@/lib/queries/admin-crm";
import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

const LABEL_ORIGEM: Record<LeadTipoSlug, string> = {
  financiamento: "Financiamento",
  "home-equity": "Home Equity",
  imoveis: "Imóveis",
  consorcio: "Consórcio",
};

function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

export type ModalLeadProps = {
  leadId: string;
  dominios: DominiosCRM;
  /** QuadroCRM.tsx faz `router.push` limpando `?lead=` da URL (docs/crm-spec.md §1.4). */
  onFechar: () => void;
};

type EstadoDialogoMotivo = { etapaLabel: string; resolver: (dados: { motivo: string; motivoObs?: string } | null) => void };

/**
 * Casca do modal de lead (docs/crm-spec.md §1.4/§3.1/§4). Os dados
 * (`getLead`/`getTimeline`/`getLembretes`) são carregados SOB DEMANDA aqui —
 * nunca no payload do quadro (§3.2/§6) — via `carregarDetalheLead`
 * (components/admin/crm/carregar-lead.ts, a "action de leitura" citada no
 * escopo; ver o comentário lá para a justificativa completa de por que não
 * um Server Component com Suspense).
 *
 * Prende o foco, fecha com Esc, devolve o foco a quem abriu — mesmo
 * contrato de ConfirmarAcao.tsx/DialogoMotivo.tsx/LeadImovelModal.tsx.
 * QuadroCRM.tsx monta este componente com `key={leadId}`, então trocar de
 * lead (ex.: abrir outro card sem fechar) remonta do zero em vez de
 * carregar por cima do estado antigo.
 */
export function ModalLead({ leadId, dominios, onFechar }: ModalLeadProps) {
  const { mostrarToast } = useToast();
  const [detalhe, setDetalhe] = useState<DetalheLeadCarregado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [dialogoMotivo, setDialogoMotivo] = useState<EstadoDialogoMotivo | null>(null);
  const [movendoEtapa, setMovendoEtapa] = useState(false);

  const painelRef = useRef<HTMLDivElement>(null);
  const ultimoFocoRef = useRef<HTMLElement | null>(null);

  // `carregarDetalheLead` (server action) pode rejeitar — `getLead`/`getTimeline`/
  // `getLembretes` (lib/queries/admin-crm.ts) fazem `if (error) throw error`.
  // Sem o try/catch, uma falha (rede, RLS, etc.) deixaria `carregando` preso em
  // `true` para sempre em vez de mostrar o erro.
  const recarregar = useCallback(async () => {
    try {
      const dados = await carregarDetalheLead(leadId);
      if (!dados) {
        setErroCarregar("Lead não encontrado, ou você não tem permissão para vê-lo.");
        setDetalhe(null);
        return;
      }
      setDetalhe(dados);
      setErroCarregar(null);
    } catch {
      setErroCarregar("Não foi possível carregar o lead. Tente novamente.");
    }
  }, [leadId]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    carregarDetalheLead(leadId)
      .then((dados) => {
        if (cancelado) return;
        if (!dados) setErroCarregar("Lead não encontrado, ou você não tem permissão para vê-lo.");
        else setDetalhe(dados);
      })
      .catch(() => {
        if (!cancelado) setErroCarregar("Não foi possível carregar o lead. Tente novamente.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [leadId]);

  useEffect(() => {
    ultimoFocoRef.current = document.activeElement as HTMLElement | null;
    const primeiro = painelRef.current?.querySelector<HTMLElement>("button");
    primeiro?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
        return;
      }
      if (e.key !== "Tab" || !painelRef.current) return;
      const focaveis = elementosFocaveis(painelRef.current);
      if (focaveis.length === 0) return;
      const primeiroEl = focaveis[0];
      const ultimoEl = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiroEl) {
        e.preventDefault();
        ultimoEl.focus();
      } else if (!e.shiftKey && document.activeElement === ultimoEl) {
        e.preventDefault();
        primeiroEl.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      ultimoFocoRef.current?.focus();
    };
    // Só na montagem — mesmo padrão de DialogoMotivo.tsx/ConfirmarAcao.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Toast + recarregar em um lugar só: cada painel filho só chama a action e reporta o resultado aqui. */
  async function executarAcao<T extends AcaoResultado>(promessa: Promise<T>, mensagemSucesso: string): Promise<boolean> {
    const resultado = await promessa;
    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível concluir a ação.");
      return false;
    }
    mostrarToast("sucesso", mensagemSucesso);
    await recarregar();
    return true;
  }

  /** Mesmo fluxo de QuadroCRM.tsx `mover()`: abre o MESMO DialogoMotivo quando a etapa exige motivo (docs/crm-spec.md §1.4). */
  async function mudarEtapa(novaEtapa: LeadEtapaSlug) {
    if (!detalhe || detalhe.lead.status === novaEtapa) return;
    const etapaAlvo = etapaPorSlug(detalhe.lead.tipo, novaEtapa);
    if (!etapaAlvo) return;

    let dadosMotivo: { motivo: string; motivoObs?: string } | null = null;
    if (etapaAlvo.exigeMotivo) {
      dadosMotivo = await new Promise((resolve) => setDialogoMotivo({ etapaLabel: etapaAlvo.label, resolver: resolve }));
      setDialogoMotivo(null);
      if (!dadosMotivo) return; // cancelado: nada é gravado (docs/crm-spec.md §5, caso de borda 2)
    }

    setMovendoEtapa(true);
    const resultado = await moverLead({
      leadId,
      etapa: novaEtapa,
      motivo: dadosMotivo?.motivo,
      motivoObs: dadosMotivo?.motivoObs,
      updatedAt: detalhe.lead.updated_at,
    });
    setMovendoEtapa(false);

    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível mover o lead.");
      return;
    }
    mostrarToast("sucesso", `Etapa alterada para ${etapaAlvo.label}.`);
    await recarregar();
  }

  const motivos: MotivoOpcao[] = dominios.motivosPerda.map((m) => ({ slug: m.slug, label: m.label }));
  // DetalheOrigemLead["dados"] é um union de Rows específicas (lead_financiamento
  // | lead_home_equity | ...) — PainelOrigem.tsx é deliberadamente genérico
  // sobre a origem, então recebe como Record indexável por `chave` de
  // lib/crm/campos.ts (a estrutura de fato é compatível; só o tipo estático não).
  const dadosOrigem = detalhe ? (detalhe.detalhe.dados as unknown as Record<string, unknown> | null) : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8 motion-reduce:transition-none"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div ref={painelRef} role="dialog" aria-modal="true" aria-labelledby="modal-lead-titulo" className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
          <h2 id="modal-lead-titulo" className="text-base font-semibold text-[var(--abissal)]">
            {detalhe ? detalhe.lead.nome : "Carregando lead…"}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
          >
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">
          {carregando ? (
            <p className="py-10 text-center text-sm text-neutral-500">Carregando…</p>
          ) : erroCarregar ? (
            <p role="alert" className="py-10 text-center text-sm text-[var(--erro)]">
              {erroCarregar}
            </p>
          ) : detalhe ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <PainelComum
                  lead={detalhe.lead}
                  tags={detalhe.tags}
                  origemLabel={LABEL_ORIGEM[detalhe.lead.tipo]}
                  dominios={dominios}
                  onMudarEtapa={mudarEtapa}
                  etapaPendente={movendoEtapa}
                  executarAcao={executarAcao}
                />
                <PainelOrigem tipo={detalhe.lead.tipo} dados={dadosOrigem} leadId={leadId} executarAcao={executarAcao} />
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <ListaLembretes lembretes={detalhe.lembretes} executarAcao={executarAcao} />
                <NovaInteracao leadId={leadId} tiposInteracao={dominios.tiposInteracao} executarAcao={executarAcao} />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Linha do tempo</h3>
                <LinhaDoTempo itens={detalhe.timeline} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <DialogoMotivo
        estado={dialogoMotivo ? { etapaLabel: dialogoMotivo.etapaLabel } : null}
        motivos={motivos}
        pendente={movendoEtapa}
        onConfirmar={(dados) => dialogoMotivo?.resolver(dados)}
        onCancelar={() => dialogoMotivo?.resolver(null)}
      />
    </div>
  );
}
