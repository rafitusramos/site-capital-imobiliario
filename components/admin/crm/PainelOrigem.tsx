"use client";

import { useMemo, useState } from "react";
import { CAMPOS_POR_ORIGEM } from "@/lib/crm/campos";
import { atualizarLead, type AcaoResultado } from "@/app/actions/admin-crm";
import { chaveParaCamel, textoEditavelParaValor, valorParaTextoEditavel } from "@/components/admin/crm/conversorCampo";
import { CampoOrigemInput } from "@/components/admin/crm/CampoOrigemInput";
import type { LeadTipoSlug } from "@/types/database";

const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";

export type PainelOrigemProps = {
  tipo: LeadTipoSlug;
  /** Linha de detalhe da origem (lead_financiamento/lead_home_equity/lead_imovel/lead_consorcio) — `null` quando o lead ainda não tem uma (docs/crm-spec.md §5, caso de borda 5). */
  dados: Record<string, unknown> | null;
  leadId: string;
  executarAcao: (promessa: Promise<AcaoResultado>, mensagemSucesso: string) => Promise<boolean>;
};

/**
 * Painel direito do modal — campos específicos da origem, dirigido
 * genericamente por `CAMPOS_POR_ORIGEM[tipo]` (docs/crm-spec.md §3.4). Não
 * conhece nenhuma origem por nome: um campo novo em lib/crm/campos.ts
 * aparece aqui sem precisar tocar este arquivo.
 *
 * Armadilha evitada no salvamento: `atualizarLead` faz upsert com TODAS as
 * chaves do schema da origem (campos omitidos viram `null` no banco — ver
 * `camposFinanciamento` etc. em app/actions/admin-crm.ts). Por isso o
 * payload sempre inclui os campos somenteLeitura com o valor ORIGINAL
 * (nunca editados aqui), não só os campos editáveis — senão salvar um campo
 * qualquer apagaria os dados que vieram do simulador do site.
 */
export function PainelOrigem({ tipo, dados, leadId, executarAcao }: PainelOrigemProps) {
  const campos = CAMPOS_POR_ORIGEM[tipo];
  const dadosOriginais = useMemo(() => dados ?? {}, [dados]);

  const [valoresEditaveis, setValoresEditaveis] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const campo of campos) {
      if (campo.calculado || campo.somenteLeitura) continue;
      inicial[campo.chave] = valorParaTextoEditavel(campo.tipo, dadosOriginais[campo.chave]);
    }
    return inicial;
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Dados combinados (originais + edições em memória) para os campos
  // `calculado` (ex.: LTV) recalcularem ao vivo enquanto o corretor digita.
  const dadosParaCalculo = { ...dadosOriginais, ...valoresParaNumeros() };

  function valoresParaNumeros(): Record<string, unknown> {
    const resultado: Record<string, unknown> = {};
    for (const campo of campos) {
      if (campo.calculado || campo.somenteLeitura) continue;
      resultado[campo.chave] = textoEditavelParaValor(campo.tipo, valoresEditaveis[campo.chave] ?? "");
    }
    return resultado;
  }

  async function salvar() {
    setErro(null);
    const payload: Record<string, unknown> = {};
    for (const campo of campos) {
      if (campo.calculado) continue;
      const chaveCamel = chaveParaCamel(campo.chave);
      payload[chaveCamel] = campo.somenteLeitura
        ? // Nunca editado aqui: preserva o valor original (nullish -> undefined,
          // nunca `null` explícito — ver conversorCampo.ts).
          (dadosOriginais[campo.chave] ?? undefined)
        : textoEditavelParaValor(campo.tipo, valoresEditaveis[campo.chave] ?? "");
    }

    setSalvando(true);
    const ok = await executarAcao(atualizarLead({ leadId, tipo, origem: payload }), "Campos da origem salvos.");
    setSalvando(false);
    if (!ok) setErro("Não foi possível salvar. Confira os valores e tente novamente.");
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Dados da origem</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campos.map((campo) => (
          <CampoOrigemInput
            key={campo.chave}
            campo={campo}
            dadosParaCalculo={dadosParaCalculo}
            valorBruto={dadosOriginais[campo.chave]}
            valor={valoresEditaveis[campo.chave]}
            onChange={(novoValor) => setValoresEditaveis((atual) => ({ ...atual, [campo.chave]: novoValor }))}
          />
        ))}
      </div>

      {erro ? (
        <p role="alert" className="mt-4 text-sm text-[var(--erro)]">
          {erro}
        </p>
      ) : null}

      <div className="mt-4">
        <button type="button" onClick={salvar} disabled={salvando} className={BOTAO_PRIMARIO}>
          {salvando ? "Salvando…" : "Salvar campos da origem"}
        </button>
      </div>
    </div>
  );
}
