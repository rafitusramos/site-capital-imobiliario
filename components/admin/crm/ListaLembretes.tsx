"use client";

import { useState } from "react";
import { concluirLembrete, reagendarLembrete, type AcaoResultado } from "@/app/actions/admin-crm";
import { ehHoje, estaAtrasado, rotuloRelativo } from "@/lib/crm/lembretes";
import { IconeRelogio } from "@/components/admin/crm/icones";
import { EstadoVazio } from "@/components/admin/crm/EstadoVazio";
import type { Database } from "@/types/database";

type LembreteRow = Database["public"]["Tables"]["crm_lembretes"]["Row"];

const BOTAO_SECUNDARIO =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:border-[var(--abissal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";
const CAMPO =
  "rounded-md border border-neutral-300 px-2 py-1 text-xs focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";

export type ListaLembretesProps = {
  lembretes: LembreteRow[];
  executarAcao: (promessa: Promise<AcaoResultado>, mensagemSucesso: string) => Promise<boolean>;
};

function dois(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Data/hora LOCAIS (do navegador, na prática América/São Paulo — mesma
 * premissa documentada em NovaInteracao.tsx), não UTC. `toISOString()`
 * sempre devolve UTC: usá-lo aqui pré-preencheria o formulário com a hora
 * errada (um lembrete às 14:00 em SP é 17:00 em UTC) — a mesma classe de
 * armadilha de fuso que lib/crm/lembretes.ts documenta extensamente.
 */
function paraCamposLocais(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  return {
    data: `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`,
    hora: `${dois(d.getHours())}:${dois(d.getMinutes())}`,
  };
}

/** Formulário inline de reagendamento — um lembrete por vez (o id em `reagendando` controla qual está aberto). */
function FormularioReagendar({
  lembrete,
  onCancelar,
  onConfirmar,
  pendente,
}: {
  lembrete: LembreteRow;
  onCancelar: () => void;
  onConfirmar: (novaDataIso: string) => void;
  pendente: boolean;
}) {
  const camposIniciais = paraCamposLocais(lembrete.agendado_para);
  const [data, setData] = useState(camposIniciais.data);
  const [hora, setHora] = useState(camposIniciais.hora);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <label className="sr-only" htmlFor={`reagendar-data-${lembrete.id}`}>
        Nova data
      </label>
      <input id={`reagendar-data-${lembrete.id}`} type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} />
      <label className="sr-only" htmlFor={`reagendar-hora-${lembrete.id}`}>
        Nova hora
      </label>
      <input id={`reagendar-hora-${lembrete.id}`} type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} />
      <button
        type="button"
        disabled={pendente}
        onClick={() => onConfirmar(new Date(`${data}T${hora}:00`).toISOString())}
        className={BOTAO_SECUNDARIO}
      >
        Confirmar
      </button>
      <button type="button" disabled={pendente} onClick={onCancelar} className={BOTAO_SECUNDARIO}>
        Cancelar
      </button>
    </div>
  );
}

/**
 * Lembretes do lead (docs/crm-spec.md §3.1) — pendentes com ação de concluir
 * e reagendar; concluídos listados abaixo, discretos, só para contexto (o
 * histórico "isso já foi combinado" importa tanto quanto o que falta).
 */
export function ListaLembretes({ lembretes, executarAcao }: ListaLembretesProps) {
  const [reagendando, setReagendando] = useState<string | null>(null);
  const [pendenteId, setPendenteId] = useState<string | null>(null);

  const pendentes = lembretes.filter((l) => !l.concluido);
  const concluidos = lembretes.filter((l) => l.concluido);
  const agora = new Date();

  async function concluir(id: string) {
    setPendenteId(id);
    await executarAcao(concluirLembrete(id), "Lembrete concluído.");
    setPendenteId(null);
  }

  async function reagendar(id: string, novaDataIso: string) {
    setPendenteId(id);
    const ok = await executarAcao(reagendarLembrete(id, novaDataIso), "Lembrete reagendado.");
    setPendenteId(null);
    if (ok) setReagendando(null);
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Lembretes</h3>

      {pendentes.length === 0 ? (
        <EstadoVazio variante="coluna" mensagem="Nenhum lembrete pendente." />
      ) : (
        <ul className="space-y-2">
          {pendentes.map((lembrete) => {
            const atrasado = estaAtrasado(lembrete.agendado_para, agora);
            const hoje = ehHoje(lembrete.agendado_para, agora);
            const cor = atrasado ? "text-[var(--erro)]" : hoje ? "text-[var(--bronze)]" : "text-[var(--abissal)]";

            return (
              <li key={lembrete.id} className="rounded-md border border-black/5 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className={`flex items-start gap-1.5 text-sm ${cor}`}>
                    <IconeRelogio className="mt-0.5 h-4 w-4 flex-none" />
                    <span>
                      <span className="font-medium">{atrasado ? "Atrasado · " : ""}{rotuloRelativo(lembrete.agendado_para, agora)}</span>
                      <br />
                      {lembrete.descricao}
                    </span>
                  </p>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    disabled={pendenteId === lembrete.id}
                    onClick={() => concluir(lembrete.id)}
                    className={BOTAO_SECUNDARIO}
                  >
                    Concluir
                  </button>
                  <button
                    type="button"
                    disabled={pendenteId === lembrete.id}
                    onClick={() => setReagendando(reagendando === lembrete.id ? null : lembrete.id)}
                    className={BOTAO_SECUNDARIO}
                  >
                    Reagendar
                  </button>
                </div>
                {reagendando === lembrete.id ? (
                  <FormularioReagendar
                    lembrete={lembrete}
                    pendente={pendenteId === lembrete.id}
                    onCancelar={() => setReagendando(null)}
                    onConfirmar={(novaDataIso) => reagendar(lembrete.id, novaDataIso)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {concluidos.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-neutral-500">
            {concluidos.length} {concluidos.length === 1 ? "lembrete concluído" : "lembretes concluídos"}
          </summary>
          <ul className="mt-2 space-y-1">
            {concluidos.map((lembrete) => (
              <li key={lembrete.id} className="text-xs text-neutral-400 line-through decoration-neutral-300">
                {lembrete.descricao}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
