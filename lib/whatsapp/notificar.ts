import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadEtapaSlug } from "@/types/database";
import type { LeadWa } from "./motor";
import { motorWaPadrao } from "./motor-padrao";

// Pontes entre o CRM/formulário e o motor do WhatsApp (spec §7). Rodam em after():
// nunca lançam, e falha aqui jamais afeta a captação nem o movimento de etapa.

async function lerLead(leadId: string): Promise<LeadWa | null> {
  const { data, error } = await createAdminClient()
    .from("leads")
    .select("id, tipo, nome, telefone, protocolo, consentimento_whatsapp_em")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    tipo: data.tipo,
    nome: data.nome,
    telefone: data.telefone,
    protocolo: data.protocolo,
    consentimentoWhatsappEm: data.consentimento_whatsapp_em ?? null,
  };
}

/** Lead novo: agenda a confirmação (o motor confere consentimento e telefone). */
export async function dispararWhatsAppNovoLead(leadId: string): Promise<void> {
  try {
    const motor = motorWaPadrao();
    if (!motor) return;
    const lead = await lerLead(leadId);
    if (!lead) {
      console.error("[whatsapp] novo lead não encontrado:", leadId);
      return;
    }
    await motor.agendarConfirmacao(lead);
  } catch (e) {
    console.error("[whatsapp] falha ao agendar a confirmação:", e);
  }
}

/**
 * Mudança de etapa. Etapa destino sem `notifica_lead` (ou `suprimir`) só cancela os avisos
 * pendentes; caso contrário `agendarAvisoEtapa` (que cancela antes de agendar).
 */
export async function dispararWhatsAppMudancaEtapa(
  leadId: string,
  para: LeadEtapaSlug,
  suprimir: boolean,
): Promise<void> {
  try {
    const motor = motorWaPadrao();
    if (!motor) return;
    if (suprimir) {
      await motor.cancelarAvisosEtapa(leadId);
      return;
    }
    const lead = await lerLead(leadId);
    if (!lead) {
      console.error("[whatsapp] lead não encontrado na mudança de etapa:", leadId);
      return;
    }
    const { data: etapa, error } = await createAdminClient()
      .from("crm_etapas")
      .select("notifica_lead")
      .eq("tipo", lead.tipo)
      .eq("slug", para)
      .maybeSingle();
    if (error) throw error;
    if (!etapa?.notifica_lead) {
      await motor.cancelarAvisosEtapa(leadId);
      return;
    }
    await motor.agendarAvisoEtapa(lead, para);
  } catch (e) {
    console.error("[whatsapp] falha no aviso de mudança de etapa:", e);
  }
}
