"use client";

import { limparConsentimento } from "@/lib/consentimento";

/**
 * Link discreto do rodapé que permite mudar de ideia depois de responder ao
 * banner de consentimento. Sem isso a escolha feita uma vez seria
 * irreversível. Limpa o estado gravado — o que faz o BannerConsentimento
 * (que ouve o mesmo evento) reaparecer.
 */
export function AbrirPreferenciasCookies() {
  return (
    <button type="button" onClick={() => limparConsentimento()}>
      Cookies e privacidade
    </button>
  );
}
