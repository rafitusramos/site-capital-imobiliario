"use client";

import type { CampoCRM } from "@/lib/crm/campos";
import { CampoOrigemInput } from "@/components/admin/crm/CampoOrigemInput";

export type PainelOrigemProps = {
  /** Partição `bloco !== "lead"` de `CAMPOS_POR_ORIGEM[tipo]` (useCamposOrigem.ts) — só os campos que vieram do formulário do site. */
  campos: CampoCRM[];
  /** Linha de detalhe da origem (lead_financiamento/lead_home_equity/lead_imovel/lead_consorcio) — `null` quando o lead ainda não tem uma (docs/crm-spec.md §5, caso de borda 5). */
  dados: Record<string, unknown> | null;
  /** Dados combinados (originais + edições em memória do bloco "lead") — repassado pronto do useCamposOrigem.ts para os campos `calculado` (ex.: LTV) recalcularem ao vivo mesmo sendo exibidos aqui. */
  dadosParaCalculo: Record<string, unknown>;
  origemLabel: string;
};

/**
 * Painel direito do modal — só exibição (docs/crm-spec.md §3.4, item 10 dos
 * ajustes de CRM). Antes tinha estado próprio e botão de salvar; os campos
 * editáveis da origem migraram para o bloco "Dados do lead"
 * (PainelComum.tsx), que agora é o único lugar com salvamento — daqui só
 * sobrou o que veio pronto do formulário do site, sempre somenteLeitura ou
 * calculado. Não conhece nenhuma origem por nome: dirigido por `campos`
 * (partição de `CAMPOS_POR_ORIGEM[tipo]` feita em useCamposOrigem.ts).
 */
export function PainelOrigem({ campos, dados, dadosParaCalculo, origemLabel }: PainelOrigemProps) {
  const dadosOriginais = dados ?? {};

  return (
    <div>
      <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Origem
        <span className="normal-case text-[var(--abissal)]">{origemLabel}</span>
      </h3>
      {campos.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum dado de formulário do site — este lead foi criado manualmente.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {campos.map((campo) => (
            <CampoOrigemInput
              key={campo.chave}
              campo={campo}
              dadosParaCalculo={dadosParaCalculo}
              valorBruto={dadosOriginais[campo.chave]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
