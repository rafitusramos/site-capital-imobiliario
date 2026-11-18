import "server-only";

export interface ConfigWhatsApp {
  token: string;
  phoneNumberId: string;
  wabaId: string;
  /** Segredos aceitos na assinatura do webhook (app do Instagram e/ou app do WhatsApp). */
  segredos: string[];
}

/**
 * Variáveis do módulo WhatsApp, lidas no momento da chamada. Devolve null se faltar
 * token, número, WABA ou todo segredo de assinatura: é a trava das rotas do WhatsApp.
 */
export function configWhatsApp(): ConfigWhatsApp | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_WABA_ID;
  const segredos = [process.env.META_APP_SECRET, process.env.WHATSAPP_APP_SECRET].filter(
    (s): s is string => !!s,
  );
  if (!token || !phoneNumberId || !wabaId || segredos.length === 0) return null;
  return { token, phoneNumberId, wabaId, segredos };
}
