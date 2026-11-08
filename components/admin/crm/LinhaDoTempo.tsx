"use client";

import { useState } from "react";
import { editarInteracao, excluirInteracao, type AcaoResultado } from "@/app/actions/admin-crm";
import { obterIconeInteracao, IconeLapis, IconeLixeira, IconeRelogio } from "@/components/admin/crm/icones";
import { EstadoVazio } from "@/components/admin/crm/EstadoVazio";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { formatarData } from "@/lib/crm/tempo";
import type { LinhaTimelineCRM, UsuarioCRM } from "@/lib/queries/admin-crm";

const BOTAO_ICONE =
  "rounded p-1 text-neutral-400 transition hover:bg-black/5 hover:text-[var(--abissal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]";

export type LinhaDoTempoProps = {
  itens: LinhaTimelineCRM[];
  /** Quem está vendo: define em quais interações aparecem os controles de editar/apagar. */
  usuario: UsuarioCRM;
  executarAcao: (promessa: Promise<AcaoResultado>, mensagemSucesso: string) => Promise<boolean>;
};

/** Só o autor ou um admin mexe numa interação, e nunca nas automáticas — a action e a RLS (migration 024) impõem o mesmo. */
function podeAlterar(item: LinhaTimelineCRM, usuario: UsuarioCRM): boolean {
  if (item.natureza !== "interacao" || item.automatica || !item.item_id) return false;
  return usuario.souAdmin || (usuario.id !== null && item.autor_id === usuario.id);
}

/**
 * Histórico cronológico unificado de `getTimeline` — interações, transições
 * de etapa e lembretes (agendado/concluído), mais recente primeiro (a própria
 * `vw_crm_timeline` já devolve nessa ordem; docs/crm-spec.md §2.2/§3.1).
 * Transições de etapa, lembretes e interações automáticas são visualmente
 * mais discretos que uma nota escrita por gente — sem cor de destaque, texto
 * menor. Notas de gente ganham editar/apagar para o autor (ou admin).
 */
export function LinhaDoTempo({ itens, usuario, executarAcao }: LinhaDoTempoProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [apagarId, setApagarId] = useState<string | null>(null);
  const [apagando, setApagando] = useState(false);

  if (itens.length === 0) {
    return <EstadoVazio variante="coluna" mensagem="Nenhum histórico ainda." />;
  }

  function iniciarEdicao(item: LinhaTimelineCRM) {
    setEditandoId(item.item_id);
    setRascunho(item.corpo ?? "");
  }

  async function salvarEdicao() {
    if (!editandoId) return;
    setSalvando(true);
    const ok = await executarAcao(editarInteracao({ interacaoId: editandoId, conteudo: rascunho }), "Interação atualizada.");
    setSalvando(false);
    if (ok) setEditandoId(null);
  }

  async function confirmarApagar() {
    if (!apagarId) return;
    setApagando(true);
    await executarAcao(excluirInteracao(apagarId), "Interação apagada.");
    setApagando(false);
    setApagarId(null);
  }

  return (
    <>
      <ol className="space-y-3">
        {itens.map((item, indice) => {
          const automatico = item.natureza !== "interacao" || item.automatica;
          const Icone =
            item.natureza === "interacao" ? obterIconeInteracao(item.tipo) : item.natureza === "lembrete" ? IconeRelogio : null;
          const editando = item.natureza === "interacao" && item.item_id !== null && item.item_id === editandoId;
          const alteravel = podeAlterar(item, usuario);

          return (
            <li key={`${item.natureza}-${item.item_id ?? indice}-${item.tipo}`} className="flex gap-2.5">
              <div
                className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${
                  automatico ? "bg-black/5 text-neutral-400" : "bg-[var(--jade)]/10 text-[var(--jade)]"
                }`}
                aria-hidden="true"
              >
                {Icone ? <Icone className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs ${automatico ? "text-neutral-500" : "text-[var(--abissal)]"}`}>
                    <span className="font-medium">{item.tipo_label ?? item.tipo}</span>
                    {item.autor_nome ? <span className="text-neutral-400"> · {item.autor_nome}</span> : null}
                    <span className="text-neutral-400"> · {formatarData(item.ocorrido_em)}</span>
                    {item.editada_em ? (
                      <span className="text-neutral-400" title={`Editada em ${formatarData(item.editada_em)}`}>
                        {" "}
                        · editada
                      </span>
                    ) : null}
                  </p>
                  {alteravel && !editando ? (
                    <div className="flex flex-none gap-0.5">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(item)}
                        aria-label="Editar interação"
                        title="Editar"
                        className={BOTAO_ICONE}
                      >
                        <IconeLapis className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setApagarId(item.item_id)}
                        aria-label="Apagar interação"
                        title="Apagar"
                        className={BOTAO_ICONE}
                      >
                        <IconeLixeira className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {editando ? (
                  <div className="mt-1">
                    <label className="sr-only" htmlFor={`editar-${item.item_id}`}>
                      Conteúdo da interação
                    </label>
                    <textarea
                      id={`editar-${item.item_id}`}
                      rows={3}
                      maxLength={5000}
                      value={rascunho}
                      onChange={(e) => setRascunho(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]"
                    />
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        onClick={salvarEdicao}
                        disabled={salvando || rascunho.trim() === ""}
                        className="rounded-md bg-[var(--jade)] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50"
                      >
                        {salvando ? "Salvando…" : "Salvar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        disabled={salvando}
                        className="rounded-md px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : item.corpo ? (
                  <p className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${automatico ? "text-neutral-500" : "text-[var(--tinta)]"}`}>
                    {item.corpo}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <ConfirmarAcao
        aberto={apagarId !== null}
        titulo="Apagar interação"
        descricao="A interação some da linha do tempo. Um lembrete criado junto com ela continua na lista de lembretes. Não dá para desfazer."
        rotuloConfirmar="Apagar"
        variante="perigo"
        pendente={apagando}
        onConfirmar={confirmarApagar}
        onCancelar={() => setApagarId(null)}
      />
    </>
  );
}
