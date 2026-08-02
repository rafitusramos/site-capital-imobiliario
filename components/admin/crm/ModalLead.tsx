"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { carregarDetalheLead, type DetalheLeadCarregado } from "@/components/admin/crm/carregar-lead";
import { atualizarLead, moverLead, type AcaoResultado } from "@/app/actions/admin-crm";
import { etapaPorSlug } from "@/lib/crm/etapas";
import { formatarData } from "@/lib/crm/tempo";
import { useToast } from "@/lib/admin/toast";
import { IconeFechar } from "@/components/admin/crm/icones";
import { CorpoModalLead } from "@/components/admin/crm/CorpoModalLead";
import { DialogoMotivo, type MotivoOpcao } from "@/components/admin/crm/DialogoMotivo";
import type { DominiosCRM } from "@/lib/queries/admin-crm";
import type { LeadEtapaSlug } from "@/types/database";

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
  const [nome, setNome] = useState("");

  const painelRef = useRef<HTMLDivElement>(null);
  const ultimoFocoRef = useRef<HTMLElement | null>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

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

  // Semeia o campo de nome do cabeçalho só quando o valor vindo do banco
  // muda (primeira carga e depois de cada `recarregar()`) — o próprio input
  // é quem controla o valor enquanto o operador digita, este efeito nunca
  // deve pisar em cima de uma edição em andamento.
  useEffect(() => {
    if (detalhe) setNome(detalhe.lead.nome);
    // A dependência é o VALOR, não o objeto `detalhe`: incluir `detalhe`
    // inteiro (o que a regra exige) faria o efeito rodar a cada nova
    // identidade do objeto e sobrescrever o nome enquanto o operador
    // digita — exatamente o que o comentário acima diz que não pode
    // acontecer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalhe?.lead.nome]);

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
        // Escape no campo de nome desfaz a edição em vez de fechar o modal
        // (aoTeclarNome, abaixo). Tem de ser decidido AQUI: este listener é
        // nativo e está no `document`, o mesmo nó onde o Next monta a raiz do
        // React — `stopPropagation()` no evento sintético do input não impede
        // um listener irmão do mesmo nó de disparar.
        if (e.target === nomeRef.current) return;
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

  /** onBlur do input de nome (item 6 dos ajustes de CRM): valida, salva, ou desfaz — nunca deixa o cabeçalho exibir um nome que não está no banco. */
  async function salvarNome() {
    if (!detalhe) return;
    const valor = nome.trim();
    if (valor === detalhe.lead.nome) return; // sem mudança real: não gasta uma mutação à toa
    if (valor.length < 3) {
      mostrarToast("erro", "Informe o nome completo.");
      setNome(detalhe.lead.nome);
      return;
    }
    await executarAcao(atualizarLead({ leadId, tipo: detalhe.lead.tipo, comum: { nome: valor } }), "Nome atualizado.");
  }

  /** Enter salva (mesmo caminho do blur); Escape desfaz a edição — quem impede o Escape daqui de também fechar o modal é o handler global, que ignora o evento quando o alvo é este input. */
  function aoTeclarNome(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setNome(detalhe?.lead.nome ?? "");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8 motion-reduce:transition-none"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label={detalhe ? `Lead ${detalhe.lead.nome}` : "Carregando lead"}
        className="w-full max-w-4xl rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-black/5 px-5 py-4">
          <div className="min-w-0 flex-1">
            {detalhe ? (
              <input
                ref={nomeRef}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onBlur={salvarNome}
                onKeyDown={aoTeclarNome}
                aria-label="Nome do lead"
                className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--abissal)] transition hover:border-neutral-300 focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]"
              />
            ) : (
              <p className="px-2 py-1 text-base font-semibold text-[var(--abissal)]">Carregando lead…</p>
            )}
          </div>

          {detalhe ? (
            <div className="flex-none text-right leading-tight">
              <span className="block text-xs font-medium text-neutral-500 [font-family:var(--mono),monospace]">
                {detalhe.lead.protocolo}
              </span>
              <span className="block text-[11px] text-neutral-400">Criado em {formatarData(detalhe.lead.created_at)}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex-none rounded-md p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
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
            <CorpoModalLead
              detalhe={detalhe}
              dominios={dominios}
              leadId={leadId}
              executarAcao={executarAcao}
              onMudarEtapa={mudarEtapa}
              etapaPendente={movendoEtapa}
            />
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
