"use client";

import { useState } from "react";
import { registrarInteracao, type AcaoResultado } from "@/app/actions/admin-crm";
import type { LeadInteracaoTipo } from "@/types/database";
import type { DominiosCRM } from "@/lib/queries/admin-crm";

const CAMPO =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";
const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";

// 'sistema' é reservado ao log automático (lib/validations/crm.ts,
// TIPOS_INTERACAO_MANUAIS) — nunca oferecido como opção manual aqui.
const TIPO_RESERVADO = "sistema";

export type NovaInteracaoProps = {
  leadId: string;
  tiposInteracao: DominiosCRM["tiposInteracao"];
  executarAcao: (promessa: Promise<AcaoResultado>, mensagemSucesso: string) => Promise<boolean>;
};

/**
 * Composer de nova interação + lembrete opcional, na mesma transação
 * (docs/crm-spec.md §3.5, RPC `registrar_interacao_crm`). Data/hora do
 * lembrete são dois inputs nativos separados (mais acessíveis que um único
 * datetime-local) combinados num ISO só na hora de enviar.
 */
export function NovaInteracao({ leadId, tiposInteracao, executarAcao }: NovaInteracaoProps) {
  const opcoesTipo = tiposInteracao.filter((t) => t.slug !== TIPO_RESERVADO);
  const tipoPadrao = (opcoesTipo[0]?.slug ?? "nota") as LeadInteracaoTipo;

  const [tipo, setTipo] = useState<LeadInteracaoTipo>(tipoPadrao);
  const [conteudo, setConteudo] = useState("");
  const [comLembrete, setComLembrete] = useState(false);
  const [dataLembrete, setDataLembrete] = useState("");
  const [horaLembrete, setHoraLembrete] = useState("");
  const [descricaoLembrete, setDescricaoLembrete] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    if (conteudo.trim().length === 0) {
      setErro("Escreva o conteúdo da interação.");
      return;
    }

    let lembrete: { agendadoPara: string; descricao: string } | undefined;
    if (comLembrete) {
      if (!dataLembrete || !horaLembrete) {
        setErro("Informe data e hora do lembrete.");
        return;
      }
      if (descricaoLembrete.trim().length < 3) {
        setErro("Descreva o lembrete (mín. 3 caracteres).");
        return;
      }
      // Data/hora nos dois inputs são lidas no fuso do dispositivo do
      // corretor — na prática América/São Paulo, já que é quem opera o CRM.
      const agendado = new Date(`${dataLembrete}T${horaLembrete}:00`);
      if (agendado.getTime() <= Date.now()) {
        setErro("A data do lembrete precisa ser no futuro.");
        return;
      }
      lembrete = { agendadoPara: agendado.toISOString(), descricao: descricaoLembrete.trim() };
    }

    setEnviando(true);
    const ok = await executarAcao(
      registrarInteracao({ leadId, tipo, conteudo: conteudo.trim(), lembrete }),
      "Interação registrada.",
    );
    setEnviando(false);
    if (!ok) return;

    setConteudo("");
    setComLembrete(false);
    setDataLembrete("");
    setHoraLembrete("");
    setDescricaoLembrete("");
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Nova interação</h3>

      <div className="mb-3">
        <label className={LABEL} htmlFor="ni-tipo">
          Tipo
        </label>
        <select
          id="ni-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as LeadInteracaoTipo)}
          className={CAMPO}
        >
          {opcoesTipo.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className={LABEL} htmlFor="ni-conteudo">
          O que aconteceu
        </label>
        <textarea
          id="ni-conteudo"
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          rows={3}
          maxLength={5000}
          className={CAMPO}
        />
      </div>

      <div className="mb-3">
        <label className="flex items-center gap-2 text-sm text-[var(--abissal)]">
          <input type="checkbox" checked={comLembrete} onChange={(e) => setComLembrete(e.target.checked)} />
          Criar lembrete de follow-up
        </label>
      </div>

      {comLembrete ? (
        <div className="mb-3 space-y-3 rounded-md border border-black/5 bg-black/[0.02] p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="ni-lembrete-data">
                Data
              </label>
              <input
                id="ni-lembrete-data"
                type="date"
                value={dataLembrete}
                onChange={(e) => setDataLembrete(e.target.value)}
                className={CAMPO}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="ni-lembrete-hora">
                Hora
              </label>
              <input
                id="ni-lembrete-hora"
                type="time"
                value={horaLembrete}
                onChange={(e) => setHoraLembrete(e.target.value)}
                className={CAMPO}
              />
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="ni-lembrete-desc">
              Descrição do lembrete
            </label>
            <input
              id="ni-lembrete-desc"
              type="text"
              maxLength={200}
              value={descricaoLembrete}
              onChange={(e) => setDescricaoLembrete(e.target.value)}
              className={CAMPO}
            />
          </div>
        </div>
      ) : null}

      {erro ? (
        <p role="alert" className="mb-3 text-sm text-[var(--erro)]">
          {erro}
        </p>
      ) : null}

      <button type="button" onClick={enviar} disabled={enviando} className={BOTAO_PRIMARIO}>
        {enviando ? "Registrando…" : "Registrar interação"}
      </button>
    </div>
  );
}
