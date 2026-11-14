import "server-only";
import { emailerDoAmbiente } from "@/lib/email/enviar";
import { whatsappAdmin } from "@/lib/email/templates/whatsapp-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarCloud } from "./cloud";
import { configWhatsApp } from "./config";
import { criarMotorWa, type AvisoDonoWa, type MotorWa } from "./motor";
import { criarRepositorioWa } from "./repositorio";

// Monta o motor de produção (repositório Supabase + Cloud API real). Devolve null
// sem configuração: as rotas tratam isso como "nada a fazer", nunca como erro.

/**
 * Aviso ao dono por e-mail. Nunca lança. O registro em crm_emails só existe para
 * lead cadastrado (a tabela exige lead_id); contato desconhecido só é enviado.
 */
async function avisarDonoPadrao(aviso: AvisoDonoWa): Promise<void> {
  try {
    const destino = process.env.EMAIL_ADMIN;
    const registrar = async (linha: {
      destinatario: string;
      status: "enviado" | "falhou" | "sem-chave";
      resend_id: string | null;
      erro: string | null;
    }) => {
      if (!aviso.leadId) return;
      const { error } = await createAdminClient()
        .from("crm_emails")
        .insert({ lead_id: aviso.leadId, tipo: "whatsapp-admin", etapa: null, ...linha });
      if (error) console.error("[whatsapp] não foi possível registrar em crm_emails:", error);
    };

    if (!destino) {
      console.error("[whatsapp] EMAIL_ADMIN ausente: aviso ao dono não enviado.");
      await registrar({ destinatario: "", status: "falhou", resend_id: null, erro: "EMAIL_ADMIN ausente" });
      return;
    }
    const email = whatsappAdmin({
      nome: aviso.nome,
      telefone: aviso.telefone,
      protocolo: aviso.protocolo,
      texto: aviso.texto,
    });
    const r = await emailerDoAmbiente().enviar({
      para: destino,
      assunto: email.assunto,
      html: email.html,
      texto: email.texto,
    });
    if (r.enviado) await registrar({ destinatario: destino, status: "enviado", resend_id: r.id, erro: null });
    else if (r.motivo === "sem-chave")
      await registrar({ destinatario: destino, status: "sem-chave", resend_id: null, erro: null });
    else await registrar({ destinatario: destino, status: "falhou", resend_id: null, erro: r.erro });
  } catch (e) {
    console.error("[whatsapp] falha no aviso ao dono:", e);
  }
}

export function motorWaPadrao(): MotorWa | null {
  const config = configWhatsApp();
  if (!config) return null;
  return criarMotorWa({
    repo: criarRepositorioWa(),
    cloud: criarCloud(config.token, config.phoneNumberId),
    avisarDono: avisarDonoPadrao,
    agora: () => new Date(),
  });
}
