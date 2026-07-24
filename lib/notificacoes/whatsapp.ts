import "server-only";

/**
 * Placeholder — hoje não existe integração de WhatsApp servidor→corretor
 * no projeto (só um link estático wa.me que o próprio usuário clica na
 * tela de sucesso do formulário, isso continua igual). Quando a
 * integração real (API do WhatsApp Business + credencial) existir, o
 * corpo desta função entra aqui, sem mudar a assinatura nem quem a chama
 * (app/actions/leads.ts). Como nada é enviado de fato ainda, retorna
 * sempre false — o chamador não deve marcar leads.enviado_whatsapp com
 * base nisso.
 */
export async function notificarNovoLead(_lead: {
  id: string;
  protocolo: string;
  nome: string;
  telefone: string;
}): Promise<boolean> {
  return false;
}
