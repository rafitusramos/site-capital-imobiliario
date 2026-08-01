"use server";

import { getLead, getLembretes, getTimeline, type LeadDetalhado, type LinhaTimelineCRM } from "@/lib/queries/admin-crm";
import type { Database } from "@/types/database";

/**
 * Leitura sob demanda do modal de lead (docs/crm-spec.md §3.2: "a linha do
 * tempo NÃO viaja no payload do quadro"). `ModalLead.tsx` é client component
 * (precisa de estado local para abrir/fechar, foco preso, recarregar depois
 * de cada mutação) — as três leituras de que ele precisa (`getLead`,
 * `getTimeline`, `getLembretes`, em lib/queries/admin-crm.ts, já existentes e
 * "server-only") não podem ser importadas direto num client component.
 *
 * `app/actions/admin-crm.ts` é uma das camadas que a Etapa 7/8 não pode
 * alterar (regra dura do escopo) e só tem ações de ESCRITA — por isso esta
 * ponte de LEITURA mora aqui, em vez de lá. É o mecanismo "action de
 * leitura" citado no escopo, escolhido em vez de um Server Component
 * aninhado com Suspense: `QuadroCRM.tsx` já é uma árvore client pesada
 * (DndContext, useOptimistic, vários diálogos) — encaixar ali um Server
 * Component que streama por baixo do `?lead=` complicaria o controle de
 * abrir/fechar/recarregar sem ganho real, já que o modal precisa recarregar
 * a MESMA leitura depois de qualquer mutação (nova interação, mover etapa,
 * concluir lembrete etc.), não só na primeira renderização.
 */
export type DetalheLeadCarregado = LeadDetalhado & {
  timeline: LinhaTimelineCRM[];
  lembretes: Database["public"]["Tables"]["crm_lembretes"]["Row"][];
};

export async function carregarDetalheLead(leadId: string): Promise<DetalheLeadCarregado | null> {
  const detalhado = await getLead(leadId);
  if (!detalhado) return null;

  const [timeline, lembretes] = await Promise.all([getTimeline(leadId), getLembretes(leadId)]);

  return { ...detalhado, timeline, lembretes };
}
