"use client";

import { useMemo, useState } from "react";
import { CAMPOS_POR_ORIGEM, type CampoCRM } from "@/lib/crm/campos";
import { chaveParaCamel, textoEditavelParaValor, valorParaTextoEditavel } from "@/components/admin/crm/conversorCampo";
import type { LeadTipoSlug } from "@/types/database";

/**
 * Estado dos campos de origem (docs/crm-spec.md §3.4, item 10 dos ajustes de
 * CRM). Antes vivia inteiro dentro de PainelOrigem.tsx; migrou para cá
 * porque agora dois painéis (PainelComum.tsx desenha os campos `bloco:
 * "lead"`, PainelOrigem.tsx desenha o resto) precisam compartilhar o MESMO
 * estado de edição e o MESMO payload de salvamento — a origem tem um único
 * botão de salvar (no bloco do lead), não dois.
 *
 * Mora em CorpoModalLead.tsx (que só monta depois do detalhe carregado) e
 * não em ModalLead.tsx (que monta com `detalhe = null`) para o inicializador
 * do `useState` enxergar os dados de verdade desde a primeira renderização.
 */
export function useCamposOrigem(tipo: LeadTipoSlug, dados: Record<string, unknown> | null) {
  const todosCampos = CAMPOS_POR_ORIGEM[tipo];
  const camposLead = useMemo(() => todosCampos.filter((c) => c.bloco === "lead"), [todosCampos]);
  const camposOrigem = useMemo(() => todosCampos.filter((c) => c.bloco !== "lead"), [todosCampos]);

  const dadosOriginais = useMemo(() => dados ?? {}, [dados]);

  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const campo of todosCampos) {
      if (campo.calculado || campo.somenteLeitura) continue;
      inicial[campo.chave] = valorParaTextoEditavel(campo.tipo, dadosOriginais[campo.chave]);
    }
    return inicial;
  });

  function setValor(chave: string, valor: string) {
    setValores((atual) => ({ ...atual, [chave]: valor }));
  }

  function valoresParaNumeros(): Record<string, unknown> {
    const resultado: Record<string, unknown> = {};
    for (const campo of todosCampos) {
      if (campo.calculado || campo.somenteLeitura) continue;
      resultado[campo.chave] = textoEditavelParaValor(campo.tipo, valores[campo.chave] ?? "");
    }
    return resultado;
  }

  // Dados combinados (originais + edições em memória) para os campos
  // `calculado` (ex.: LTV) recalcularem ao vivo enquanto o corretor digita.
  const dadosParaCalculo = { ...dadosOriginais, ...valoresParaNumeros() };

  /**
   * Mesmo payload que o `salvar()` original de PainelOrigem.tsx montava:
   * inclui os campos somenteLeitura com o valor ORIGINAL, senão o upsert de
   * `atualizarLead` apagaria o que veio do simulador (armadilha documentada
   * ali antes da migração deste hook).
   */
  function montarPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const campo of todosCampos) {
      if (campo.calculado) continue;
      const chaveCamel = chaveParaCamel(campo.chave);
      payload[chaveCamel] = campo.somenteLeitura
        ? (dadosOriginais[campo.chave] ?? undefined)
        : textoEditavelParaValor(campo.tipo, valores[campo.chave] ?? "");
    }
    return payload;
  }

  return { camposLead, camposOrigem, valores, setValor, dadosParaCalculo, montarPayload };
}

export type UseCamposOrigemRetorno = ReturnType<typeof useCamposOrigem>;
export type { CampoCRM };
