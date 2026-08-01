"use client";

import { useCamposOrigem } from "@/components/admin/crm/useCamposOrigem";
import { PainelComum } from "@/components/admin/crm/PainelComum";
import { PainelOrigem } from "@/components/admin/crm/PainelOrigem";
import { LinhaDoTempo } from "@/components/admin/crm/LinhaDoTempo";
import { NovaInteracao } from "@/components/admin/crm/NovaInteracao";
import { ListaLembretes } from "@/components/admin/crm/ListaLembretes";
import type { AcaoResultado } from "@/app/actions/admin-crm";
import type { DetalheLeadCarregado } from "@/components/admin/crm/carregar-lead";
import type { DominiosCRM } from "@/lib/queries/admin-crm";
import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

const LABEL_ORIGEM: Record<LeadTipoSlug, string> = {
  financiamento: "Financiamento",
  "home-equity": "Home Equity",
  imoveis: "Imóveis",
  consorcio: "Consórcio",
};

export type CorpoModalLeadProps = {
  detalhe: DetalheLeadCarregado;
  dominios: DominiosCRM;
  leadId: string;
  executarAcao: (promessa: Promise<AcaoResultado>, mensagemSucesso: string) => Promise<boolean>;
  onMudarEtapa: (etapa: LeadEtapaSlug) => void;
  etapaPendente: boolean;
};

/**
 * Conteúdo do modal de lead depois que `detalhe` carrega (docs/crm-spec.md
 * §3.1/§3.4, item 10 dos ajustes de CRM). Separado de ModalLead.tsx (que
 * monta com `detalhe = null` enquanto a leitura sob demanda não volta) por
 * causa do `useCamposOrigem`: o inicializador do `useState` dele só enxerga
 * dados de verdade se este componente só existir depois que `detalhe`
 * chegou — se o hook morasse no ModalLead, a primeira montagem (com
 * `detalhe = null`) semearia o estado vazio e ficaria errado depois.
 */
export function CorpoModalLead({ detalhe, dominios, leadId, executarAcao, onMudarEtapa, etapaPendente }: CorpoModalLeadProps) {
  // DetalheOrigemLead["dados"] é um union de Rows específicas
  // (lead_financiamento | lead_home_equity | ...) — o hook e PainelOrigem.tsx
  // são deliberadamente genéricos sobre a origem, então recebem como Record
  // indexável por `chave` de lib/crm/campos.ts (a estrutura de fato é
  // compatível; só o tipo estático não).
  const dadosOrigem = detalhe.detalhe.dados as unknown as Record<string, unknown> | null;

  const { camposLead, camposOrigem, valores, setValor, dadosParaCalculo, montarPayload } = useCamposOrigem(
    detalhe.lead.tipo,
    dadosOrigem,
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <PainelComum
          lead={detalhe.lead}
          tags={detalhe.tags}
          dominios={dominios}
          onMudarEtapa={onMudarEtapa}
          etapaPendente={etapaPendente}
          executarAcao={executarAcao}
          camposLead={camposLead}
          valoresOrigem={valores}
          onChangeOrigem={setValor}
          dadosParaCalculo={dadosParaCalculo}
          montarPayloadOrigem={montarPayload}
          tipo={detalhe.lead.tipo}
        />
        <PainelOrigem
          campos={camposOrigem}
          dados={dadosOrigem}
          dadosParaCalculo={dadosParaCalculo}
          origemLabel={LABEL_ORIGEM[detalhe.lead.tipo]}
        />
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
  );
}
