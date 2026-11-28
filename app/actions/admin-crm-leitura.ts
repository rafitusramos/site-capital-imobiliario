"use server";

import { exigirMembroCRM, idSchema } from "@/lib/admin/auth";
import { getLead, getLembretes, getSimulacoes, getTimeline, getUsuarioCRM, type LeadDetalhado, type LinhaTimelineCRM, type SimulacaoEnviada, type UsuarioCRM } from "@/lib/queries/admin-crm";
import type { Database } from "@/types/database";

/**
 * Leitura sob demanda do modal de lead (docs/crm-spec.md §3.2: "a linha do
 * tempo NÃO viaja no payload do quadro"). `ModalLead.tsx` é client component
 * (precisa de estado local para abrir/fechar, foco preso, recarregar depois
 * de cada mutação) — as três leituras de que ele precisa (`getLead`,
 * `getTimeline`, `getLembretes`, em lib/queries/admin-crm.ts, já existentes e
 * "server-only") não podem ser importadas direto num client component.
 *
 * `app/actions/admin-crm.ts` só tem ações de ESCRITA — por isso esta ponte
 * de LEITURA mora num arquivo próprio, também em `app/actions/` (o único lugar
 * do projeto com arquivos "use server"). É o mecanismo "action de
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
  /** Quem abriu o modal — a timeline só oferece editar/apagar nas interações dele (ou todas, se admin). */
  usuario: UsuarioCRM;
  /** Só para financiamento; vazio nas demais origens (e quando a migration 030 ainda não rodou). */
  simulacoes: SimulacaoEnviada[];
};

export async function carregarDetalheLead(leadId: string): Promise<DetalheLeadCarregado | null> {
  // Server action é endpoint público: sem isto qualquer um chamaria `getLead`
  // com um id qualquer. Sessão + perfil (membro) + uuid, nesta ordem; a RLS
  // ainda decide quais leads o membro enxerga.
  const { erro } = await exigirMembroCRM();
  if (erro) return null;
  if (!idSchema.safeParse(leadId).success) return null;

  const detalhado = await getLead(leadId);
  if (!detalhado) return null;

  const [timeline, lembretes, usuario, simulacoes] = await Promise.all([
    getTimeline(leadId),
    getLembretes(leadId),
    getUsuarioCRM(),
    detalhado.lead.tipo === "financiamento" ? getSimulacoes(leadId) : Promise.resolve([]),
  ]);

  return { ...detalhado, timeline, lembretes, usuario, simulacoes };
}
