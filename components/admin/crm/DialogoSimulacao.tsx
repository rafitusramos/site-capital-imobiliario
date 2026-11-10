"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { AcaoResultado } from "@/app/actions/admin-crm";
import { simulacaoPendenteDoLead } from "@/app/actions/admin-simulacao";
import { IconeFechar } from "@/components/admin/crm/icones";
import { formatarData } from "@/lib/crm/tempo";
import { CONFIG_SIMULACAO } from "@/lib/simulacao/config";
import { ErroExtracao } from "@/lib/simulacao/extrair";
import { lerPdfCreditas } from "@/lib/simulacao/extrair-pdf";
import { brl, pct } from "@/lib/simulacao/formato";
import { montarSimulacao } from "@/lib/simulacao/regras";
import type { DadosCreditas } from "@/lib/simulacao/tipos";

const URL_ROTA = "/api/admin/crm/simulacao/";

function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

/** Como o diálogo terminou; quem o abriu decide o toast. */
export type ResultadoDialogoSimulacao =
  | { tipo: "cancelado" }
  /** Modo "anexar": o PDF foi gravado no lead. Nenhum e-mail saiu. */
  | { tipo: "anexado" }
  | { tipo: "movido-e-enviado" }
  | { tipo: "movido-sem-envio" }
  /** O lead FOI movido, mas o envio falhou e a pessoa fechou. */
  | { tipo: "movido-envio-falhou" };

export type EstadoDialogoSimulacao = {
  leadId: string;
  /** E-mail do lead: onde a simulação será entregue. */
  destinatario: string;
  /** "mover": decorre de mover para Simulação. "anexar": botão "Anexar simulação" do modal. */
  modo: "mover" | "anexar";
  etapaLabel?: string;
};

export type DialogoSimulacaoProps = {
  /** `null` = fechado. */
  estado: EstadoDialogoSimulacao | null;
  /** Só no modo "mover". `suprimirAvisoLead`: true quando a simulação vai junto (o lead já a recebe). */
  executarMovimento?: (opcoes: { suprimirAvisoLead: boolean }) => Promise<AcaoResultado>;
  onFinalizar: (resultado: ResultadoDialogoSimulacao) => void;
};

type Etapa = "buscando" | "anexar" | "lendo" | "gerando" | "previa" | "enviando";

const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:cursor-not-allowed disabled:opacity-50";
const BOTAO_SECUNDARIO =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-[var(--abissal)] transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] disabled:cursor-not-allowed disabled:opacity-50";
const BOTAO_TERCIARIO =
  "rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";

/**
 * Simulação de financiamento no fluxo do CRM (docs/crm-spec.md §3.7). Mesmo
 * contrato de foco/Esc de DialogoMotivo.tsx. Dois modos:
 *
 * - "anexar" (bloco Simulações do modal): PDF da Creditas -> leitura no navegador
 *   -> prévia -> "Anexar" grava o PDF no lead. NENHUM e-mail sai.
 * - "mover" (Criado -> Simulação, por arrasto ou botão): se o lead já tem simulação
 *   anexada e não enviada, abre direto na prévia dela (com a opção de trocar o PDF);
 *   senão pede o PDF. Ações: Mover e enviar, Mover sem enviar, Cancelar.
 *
 * Ordem do "Mover e enviar": anexar (se o PDF é novo), mover (sem o aviso de etapa
 * ao lead) e só então enviar o PDF gravado. Mover falhou: nada é enviado. Envio
 * falhou: o lead fica movido e o diálogo oferece "Tentar enviar de novo" com a
 * MESMA simulação (nada é anexado de novo).
 */
export function DialogoSimulacao({ estado, executarMovimento, onFinalizar }: DialogoSimulacaoProps) {
  const [etapa, setEtapa] = useState<Etapa>("anexar");
  const [dados, setDados] = useState<DadosCreditas | null>(null);
  const [urlPrevia, setUrlPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [movido, setMovido] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  /** Simulação já gravada que o "Mover e enviar" envia. Nula até anexar (ou achar a pendente). */
  const [simulacaoId, setSimulacaoId] = useState<string | null>(null);
  /** Data em que a simulação pendente foi anexada (só quando veio do banco). */
  const [anexadaEm, setAnexadaEm] = useState<string | null>(null);

  const painelRef = useRef<HTMLDivElement>(null);
  const ultimoFocoRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idTitulo = useId();
  const idStatus = useId();

  const ocupado = etapa === "buscando" || etapa === "lendo" || etapa === "gerando" || etapa === "enviando";
  const aberto = estado !== null;
  const leadId = estado?.leadId;
  const modoEstado = estado?.modo;

  const limparPrevia = useCallback(() => {
    setUrlPrevia((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
  }, []);

  // Reinicia tudo a cada abertura e, no modo "mover", procura a simulação pendente.
  useEffect(() => {
    if (!aberto || !leadId) return;
    setDados(null);
    setErro(null);
    setMovido(false);
    setNomeArquivo(null);
    setSimulacaoId(null);
    setAnexadaEm(null);
    limparPrevia();
    ultimoFocoRef.current = document.activeElement as HTMLElement | null;
    const controle = new AbortController();
    abortRef.current = controle;

    if (modoEstado === "mover") {
      setEtapa("buscando");
      void (async () => {
        try {
          const achada = await simulacaoPendenteDoLead(leadId);
          if (controle.signal.aborted) return;
          if (!achada.sucesso) {
            setErro(achada.erro ?? "Não foi possível consultar as simulações do lead.");
            setEtapa("anexar");
            return;
          }
          if (!achada.simulacao) {
            setEtapa("anexar");
            return;
          }
          const resposta = await fetch(URL_ROTA, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "obter", leadId, simulacaoId: achada.simulacao.id }),
            signal: controle.signal,
          });
          if (!resposta.ok) {
            const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
            setErro(corpo?.erro ?? "Não foi possível abrir a simulação anexada. Anexe o PDF de novo.");
            setEtapa("anexar");
            return;
          }
          const blob = await resposta.blob();
          if (controle.signal.aborted) return;
          setUrlPrevia(URL.createObjectURL(blob));
          setSimulacaoId(achada.simulacao.id);
          setAnexadaEm(achada.simulacao.anexadaEm);
          setEtapa("previa");
        } catch (e) {
          if (controle.signal.aborted) return;
          console.error("[simulacao] não foi possível carregar a simulação anexada:", e);
          setErro("Não foi possível abrir a simulação anexada. Anexe o PDF de novo.");
          setEtapa("anexar");
        }
      })();
    } else {
      setEtapa("anexar");
    }

    return () => {
      controle.abort();
      ultimoFocoRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinicia só quando abre/fecha
  }, [aberto]);

  useEffect(() => {
    return () => {
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    };
  }, [urlPrevia]);

  // Foco inicial no primeiro controle útil.
  useEffect(() => {
    if (!aberto) return;
    const id = window.setTimeout(() => {
      painelRef.current?.querySelector<HTMLElement>("input[type=file], button")?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [aberto]);

  const sair = useCallback(() => {
    if (!estado) return;
    abortRef.current?.abort();
    onFinalizar(movido ? { tipo: "movido-envio-falhou" } : { tipo: "cancelado" });
  }, [estado, movido, onFinalizar]);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!ocupado) sair();
        return;
      }
      if (e.key !== "Tab" || !painelRef.current) return;
      const focaveis = elementosFocaveis(painelRef.current);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, ocupado, sair]);

  // Resumo textual (mesmas regras do documento): melhor banco, CET, 1ª parcela.
  const resumo = useMemo(() => {
    if (!dados) return null;
    try {
      const vm = montarSimulacao(dados, CONFIG_SIMULACAO, { referencia: "" });
      return { banco: vm.melhor.nome, cet: vm.melhor.cet, primeira: vm.melhor.primeira, bancos: vm.bancos.length };
    } catch {
      return null;
    }
  }, [dados]);

  async function gerarPrevia(d: DadosCreditas) {
    if (!estado) return;
    setEtapa("gerando");
    setErro(null);
    limparPrevia();
    const controle = new AbortController();
    abortRef.current = controle;
    try {
      const resposta = await fetch(URL_ROTA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "previa", leadId: estado.leadId, dados: d }),
        signal: controle.signal,
      });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        setErro(corpo?.erro ?? "Não foi possível gerar a prévia.");
        setEtapa("anexar");
        return;
      }
      const blob = await resposta.blob();
      setUrlPrevia(URL.createObjectURL(blob));
      setEtapa("previa");
    } catch (e) {
      if (controle.signal.aborted) return;
      console.error("[simulacao] prévia falhou:", e);
      setErro("Não foi possível gerar a prévia. Verifique a conexão e tente de novo.");
      setEtapa("anexar");
    }
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setDados(null);
    // Um PDF novo substitui a simulação pendente: o envio passa a usar a que for anexada agora.
    setSimulacaoId(null);
    setAnexadaEm(null);
    limparPrevia();
    setNomeArquivo(arquivo.name);
    if (arquivo.type && arquivo.type !== "application/pdf") {
      setErro("Anexe o PDF da simulação da Creditas.");
      return;
    }
    setEtapa("lendo");
    try {
      const lido = await lerPdfCreditas(arquivo);
      setDados(lido);
      await gerarPrevia(lido);
    } catch (err) {
      if (!(err instanceof ErroExtracao)) console.error("[simulacao] leitura do PDF falhou:", err);
      setErro(
        err instanceof ErroExtracao
          ? err.message
          : "Não foi possível ler o PDF. Tente outro arquivo ou mova sem enviar a simulação.",
      );
      setEtapa("anexar");
    }
  }

  /** Grava o PDF lido no lead (`acao: "anexar"`): sem e-mail. Devolve o id, ou null com `erro` preenchido. */
  async function anexarDados(): Promise<string | null> {
    if (!estado || !dados) return null;
    const controle = new AbortController();
    abortRef.current = controle;
    try {
      const resposta = await fetch(URL_ROTA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "anexar", leadId: estado.leadId, dados }),
        signal: controle.signal,
      });
      const corpo = (await resposta.json().catch(() => null)) as { ok?: boolean; erro?: string; simulacaoId?: string } | null;
      if (!resposta.ok || !corpo?.ok || !corpo.simulacaoId) {
        setErro(corpo?.erro ?? "Não foi possível anexar a simulação.");
        return null;
      }
      return corpo.simulacaoId;
    } catch (e) {
      if (controle.signal.aborted) return null;
      console.error("[simulacao] anexar falhou:", e);
      setErro("Não foi possível anexar a simulação. Verifique a conexão e tente de novo.");
      return null;
    }
  }

  async function mover(suprimirAvisoLead: boolean): Promise<boolean> {
    if (movido) return true;
    if (!executarMovimento) return false;
    const r = await executarMovimento({ suprimirAvisoLead });
    if (!r.sucesso) {
      setErro(r.erro ?? "Não foi possível mover o lead.");
      return false;
    }
    setMovido(true);
    return true;
  }

  /** Modo "anexar": confirma e grava. Nenhum e-mail. */
  async function anexar() {
    if (!estado || !dados) return;
    setErro(null);
    setEtapa("enviando");
    const id = await anexarDados();
    if (!id) {
      setEtapa("previa");
      return;
    }
    onFinalizar({ tipo: "anexado" });
  }

  /** Modo "mover": anexa (se o PDF é novo), move sem o aviso de etapa e envia o PDF gravado. */
  async function moverEEnviar() {
    if (!estado) return;
    setErro(null);
    setEtapa("enviando");

    let id = simulacaoId;
    if (!id) {
      id = await anexarDados();
      if (!id) {
        setEtapa("previa");
        return;
      }
      setSimulacaoId(id);
    }
    if (!movido && !(await mover(true))) {
      setEtapa("previa");
      return;
    }

    const controle = new AbortController();
    abortRef.current = controle;
    try {
      const resposta = await fetch(URL_ROTA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "enviar", leadId: estado.leadId, simulacaoId: id }),
        signal: controle.signal,
      });
      const corpo = (await resposta.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!resposta.ok || !corpo?.ok) {
        setErro(corpo?.erro ?? "Não foi possível enviar a simulação.");
        setEtapa("previa");
        return;
      }
      onFinalizar({ tipo: "movido-e-enviado" });
    } catch (e) {
      console.error("[simulacao] envio falhou:", e);
      setErro("Não foi possível enviar a simulação. Verifique a conexão e tente de novo.");
      setEtapa("previa");
    }
  }

  async function moverSemEnviar() {
    if (!estado) return;
    setErro(null);
    setEtapa("enviando");
    const ok = await mover(false);
    if (!ok) {
      setEtapa(urlPrevia ? "previa" : "anexar");
      return;
    }
    onFinalizar({ tipo: "movido-sem-envio" });
  }

  function trocarPdf() {
    setErro(null);
    setDados(null);
    setSimulacaoId(null);
    setAnexadaEm(null);
    setNomeArquivo(null);
    limparPrevia();
    setEtapa("anexar");
  }

  if (!estado) return null;

  const modoMover = estado.modo === "mover";
  const titulo = modoMover ? `Mover para ${estado.etapaLabel ?? "Simulação"}` : "Anexar simulação";
  const falhouDepoisDeMover = movido && erro !== null && etapa === "previa";
  const rotuloEnviar = falhouDepoisDeMover ? "Tentar enviar de novo" : "Mover e enviar";
  const podeAcionar = !ocupado && etapa === "previa" && (dados !== null || simulacaoId !== null);

  let status = "";
  if (etapa === "buscando") status = "Procurando a simulação anexada…";
  else if (etapa === "lendo") status = "Lendo o PDF…";
  else if (etapa === "gerando") status = "Gerando o documento… a primeira geração pode levar alguns segundos.";
  else if (etapa === "enviando") status = !modoMover ? "Anexando…" : movido ? "Enviando…" : "Movendo e enviando…";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !ocupado) sair();
      }}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
          <div>
            <h2 id={idTitulo} className="text-base font-semibold text-[var(--abissal)]">
              {titulo}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-600">
              {modoMover
                ? "A simulação segue para o e-mail do lead junto com o movimento, em um único envio."
                : "Anexe a simulação da Creditas ao lead. Nada é enviado agora: o e-mail sai quando o lead for movido para Simulação."}
            </p>
          </div>
          <button
            type="button"
            onClick={sair}
            disabled={ocupado}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] disabled:opacity-40"
          >
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <label htmlFor="simulacao-arquivo" className="mb-1 block text-sm font-medium text-[var(--abissal)]">
                PDF da Creditas
              </label>
              <input
                id="simulacao-arquivo"
                type="file"
                accept="application/pdf,.pdf"
                onChange={aoEscolherArquivo}
                disabled={ocupado}
                className="block w-full cursor-pointer text-sm text-neutral-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--jade)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#175840] disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {nomeArquivo ? `Arquivo: ${nomeArquivo}` : "Somente PDF, até 5 MB."}
              </p>
            </div>

            <p id={idStatus} role="status" aria-live="polite" className="min-h-[1.25rem] text-sm text-neutral-600">
              {status}
            </p>

            {erro ? (
              <p role="alert" className="rounded-md border border-[var(--erro)]/30 bg-[var(--erro)]/5 px-3 py-2 text-sm text-[var(--erro)]">
                {erro}
                {movido && modoMover ? " O lead já foi movido de etapa; a simulação ainda não foi enviada." : ""}
              </p>
            ) : null}

            {anexadaEm && etapa !== "anexar" ? (
              <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm">
                <p className="font-semibold text-[var(--abissal)]">Simulação já anexada ao lead</p>
                <p className="text-xs text-neutral-600">Anexada em {formatarData(anexadaEm)}</p>
                <div>
                  <p className="text-xs text-neutral-500">Enviar para</p>
                  <p className="break-all font-medium">{estado.destinatario}</p>
                </div>
                {modoMover && !movido ? (
                  <button type="button" onClick={trocarPdf} disabled={ocupado} className={BOTAO_SECUNDARIO}>
                    Trocar por outro PDF
                  </button>
                ) : null}
              </div>
            ) : null}

            {resumo && dados && etapa !== "anexar" ? (
              <dl className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Melhor banco (menor CET em TR)</dt>
                  <dd className="font-semibold text-[var(--abissal)]">{resumo.banco}</dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-xs text-neutral-500">CET a.a.</dt>
                    <dd className="font-medium [font-family:var(--mono),monospace]">{pct(resumo.cet)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-neutral-500">1ª parcela</dt>
                    <dd className="font-medium [font-family:var(--mono),monospace]">R$ {brl(resumo.primeira)}</dd>
                  </div>
                </div>
                {modoMover ? (
                  <div>
                    <dt className="text-xs text-neutral-500">Enviar para</dt>
                    <dd className="break-all font-medium">{estado.destinatario}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>

          <div className="min-h-[18rem]">
            {urlPrevia ? (
              <iframe
                title="Prévia da simulação"
                src={urlPrevia}
                className="h-[60vh] min-h-[22rem] w-full rounded-md border border-neutral-200 bg-neutral-100"
              />
            ) : (
              <div className="flex h-[60vh] min-h-[22rem] items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center text-sm text-neutral-500">
                {etapa === "buscando" || etapa === "lendo" || etapa === "gerando"
                  ? "Preparando a prévia…"
                  : "A prévia do documento aparece aqui depois que o PDF for lido."}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/5 px-5 py-3">
          <button type="button" onClick={sair} disabled={ocupado} className={BOTAO_TERCIARIO}>
            {movido ? "Fechar" : "Cancelar"}
          </button>
          {modoMover && !movido ? (
            <button type="button" onClick={moverSemEnviar} disabled={ocupado} className={BOTAO_SECUNDARIO}>
              Mover sem enviar
            </button>
          ) : null}
          {modoMover ? (
            <button type="button" onClick={moverEEnviar} disabled={!podeAcionar} className={BOTAO_PRIMARIO}>
              {rotuloEnviar}
            </button>
          ) : (
            <button type="button" onClick={anexar} disabled={!podeAcionar} className={BOTAO_PRIMARIO}>
              Anexar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
