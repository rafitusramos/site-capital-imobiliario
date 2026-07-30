/**
 * API única e tipada para disparar eventos de conversão/engajamento. Todo o
 * fan-out para gtag (GA4 + Google Ads) e fbq (Meta Pixel) — e toda a
 * tradução dos nomes de evento daqui para o que cada plataforma espera —
 * fica neste arquivo, num lugar só. O resto do site só chama `rastrear(...)`
 * e não sabe nada sobre gtag/fbq.
 */

export type EventoAnalytics =
  | { nome: "lead_enviado"; tipo: "financiamento" | "home-equity" | "imoveis" }
  | { nome: "formulario_iniciado"; tipo: string }
  | { nome: "simulador_usado"; pagina: "financiamento" | "home-equity" }
  | { nome: "whatsapp_clicado"; contexto: string };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

import { lerConsentimento, podeRastrear } from "@/lib/consentimento";

/**
 * Dispara um evento de analytics. É no-op silencioso quando:
 * - o código roda no servidor (`window` não existe);
 * - a pessoa recusou o rastreamento (`podeRastrear` false);
 * - `window.gtag`/`window.fbq` não existem (env var ausente, script ainda
 *   não carregou, bloqueador de anúncios, etc.).
 *
 * Nunca lança exceção: medição de analytics não pode, em hipótese nenhuma,
 * derrubar uma ação real do usuário — como o envio de um formulário de lead.
 */
export function rastrear(evento: EventoAnalytics): void {
  try {
    if (typeof window === "undefined") return;
    if (!podeRastrear(lerConsentimento())) return;

    switch (evento.nome) {
      case "lead_enviado":
        // GA4 e Google Ads reconhecem "generate_lead" como evento padrão de
        // geração de lead; o Meta Pixel tem o próprio evento padrão "Lead".
        window.gtag?.("event", "generate_lead", { lead_type: evento.tipo });
        window.fbq?.("track", "Lead", { content_name: evento.tipo });
        break;

      case "formulario_iniciado":
        window.gtag?.("event", "formulario_iniciado", { lead_type: evento.tipo });
        window.fbq?.("trackCustom", "FormularioIniciado", { content_name: evento.tipo });
        break;

      case "simulador_usado":
        window.gtag?.("event", "simulador_usado", { pagina: evento.pagina });
        window.fbq?.("trackCustom", "SimuladorUsado", { pagina: evento.pagina });
        break;

      case "whatsapp_clicado":
        window.gtag?.("event", "whatsapp_clicado", { contexto: evento.contexto });
        window.fbq?.("trackCustom", "WhatsappClicado", { contexto: evento.contexto });
        break;
    }
  } catch {
    // Ver comentário da função: a medição nunca pode quebrar a experiência.
  }
}
