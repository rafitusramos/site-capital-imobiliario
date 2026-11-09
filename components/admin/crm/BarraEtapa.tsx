"use client";

import type { ComponentType } from "react";
import { etapaAnterior, etapaInicial, etapaPorSlug, etapaProxima, etapasDoTipo, type EtapaCRM } from "@/lib/crm/etapas";
import {
  IconeCirculoBarra,
  IconeCirculoX,
  IconeSetaDireita,
  IconeSetaEsquerda,
  type IconeProps,
} from "@/components/admin/crm/icones";
import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

// Botão de mover etapa (item 8 dos ajustes de CRM): a cor vem por `style`
// (corBg/corTexto da etapa de destino), não daqui — a classe só cuida de
// forma, tamanho e estado. A coluna do modal tem ~400px: texto `text-xs` e
// padding menor; o alvo de toque continua com 44px de altura.
const BOTAO =
  "flex min-h-[44px] min-w-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]";
const BOTAO_ICONE = `${BOTAO} h-11 w-11 flex-none justify-center px-0`;

/** Ícone único por etapa final não-ganho: Perdido (X) e Não Qualificado (barra) não se confundem. */
const ICONE_FINAL: Partial<Record<LeadEtapaSlug, ComponentType<IconeProps>>> = {
  perdido: IconeCirculoX,
  "nao-qualificado": IconeCirculoBarra,
};

export type BarraEtapaProps = {
  tipo: LeadTipoSlug;
  status: LeadEtapaSlug;
  /** Dispara o MESMO DialogoMotivo do quadro quando a etapa exige motivo (orquestrado em ModalLead.tsx). */
  onMudarEtapa: (etapa: LeadEtapaSlug) => void;
  etapaPendente?: boolean;
};

/**
 * Bloco "Etapa" do modal numa linha só: [← anterior] (etapa atual) [próxima →]
 * [⊗ finais]. As duas colunas `1fr` mantêm a etapa atual no centro entre
 * voltar e avançar mesmo quando um dos lados está vazio (primeira etapa, ou
 * "ganho", que não tem próxima). Etapas finais não-ganho viram botão só com
 * ícone (com `title` e `aria-label`). Lead em etapa final não-ganho mostra só
 * "Reabrir em Criado" à esquerda — fora da sequência linear, reavançar são
 * dois cliques a partir de lá (lib/crm/etapas.ts `sequenciaLinear`).
 */
export function BarraEtapa({ tipo, status, onMudarEtapa, etapaPendente }: BarraEtapaProps) {
  const etapaAtual = etapaPorSlug(tipo, status);
  const emEtapaFinalNaoGanho = etapaAtual ? etapaAtual.isFinal && !etapaAtual.isGanho : false;
  const anterior = etapaAnterior(tipo, status);
  const proxima = etapaProxima(tipo, status);
  const finaisNaoGanho = etapasDoTipo(tipo).filter((e) => e.isFinal && !e.isGanho && e.slug !== status);
  const inicial = etapaInicial(tipo);

  function botaoDeNome(etapa: EtapaCRM, lado: "anterior" | "proxima") {
    const Seta = lado === "anterior" ? IconeSetaEsquerda : IconeSetaDireita;
    return (
      <button
        type="button"
        onClick={() => onMudarEtapa(etapa.slug)}
        disabled={etapaPendente}
        aria-label={`Mover para ${etapa.label}`}
        title={etapa.label}
        style={{ backgroundColor: etapa.corBg, color: etapa.corTexto }}
        className={`${BOTAO} ${lado === "anterior" ? "justify-self-start" : "justify-self-end"} max-w-full`}
      >
        {lado === "anterior" ? <Seta className="h-4 w-4 flex-none" /> : null}
        <span className="truncate">{etapa.label}</span>
        {lado === "proxima" ? <Seta className="h-4 w-4 flex-none" /> : null}
      </button>
    );
  }

  return (
    <div className="mb-4">
      <span className="mb-1 block text-sm font-medium text-[var(--abissal)]">Etapa</span>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-1">
        {emEtapaFinalNaoGanho ? (
          <button
            type="button"
            onClick={() => onMudarEtapa(inicial.slug)}
            disabled={etapaPendente}
            aria-label={`Reabrir em ${inicial.label}`}
            title={`Reabrir em ${inicial.label}`}
            style={{ backgroundColor: inicial.corBg, color: inicial.corTexto }}
            className={`${BOTAO} max-w-full justify-self-start`}
          >
            <IconeSetaEsquerda className="h-4 w-4 flex-none" />
            <span className="truncate">Reabrir em {inicial.label}</span>
          </button>
        ) : anterior ? (
          botaoDeNome(anterior, "anterior")
        ) : (
          <span />
        )}

        {etapaAtual ? (
          <span
            aria-current="step"
            title={etapaAtual.label}
            className="max-w-[9.5rem] truncate rounded-full px-3 py-1 text-center text-xs font-semibold"
            style={{ backgroundColor: etapaAtual.corBg, color: etapaAtual.corTexto }}
          >
            {etapaAtual.label}
          </span>
        ) : (
          <span />
        )}

        {!emEtapaFinalNaoGanho && proxima ? botaoDeNome(proxima, "proxima") : <span />}

        {!emEtapaFinalNaoGanho && finaisNaoGanho.length > 0 ? (
          <div className="flex items-center gap-1">
            {finaisNaoGanho.map((etapa) => {
              const Icone = ICONE_FINAL[etapa.slug] ?? IconeCirculoX;
              return (
                <button
                  key={etapa.slug}
                  type="button"
                  onClick={() => onMudarEtapa(etapa.slug)}
                  disabled={etapaPendente}
                  aria-label={`Mover para ${etapa.label}`}
                  title={etapa.label}
                  style={{ backgroundColor: etapa.corBg, color: etapa.corTexto }}
                  className={BOTAO_ICONE}
                >
                  <Icone className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
