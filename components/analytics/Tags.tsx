"use client";

import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";
import {
  lerConsentimento,
  podeRastrear,
  EVENTO_CONSENTIMENTO,
  type EstadoConsentimento,
} from "@/lib/consentimento";

// Lidos direto de process.env.NEXT_PUBLIC_* (literal, não via chave dinâmica)
// para o Next.js conseguir substituí-los em build time no bundle do cliente.
// Quando uma env var não existe, a tag correspondente simplesmente não
// entra no JSX abaixo — o site funciona igual, sem erro em console.
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Quando a pessoa RECUSA depois que as tags já carregaram (postura
 * opt-out — ver lib/consentimento.ts), não basta parar de mandar evento do
 * nosso lado: é preciso avisar cada plataforma pela própria API de
 * consentimento dela, porque é o único jeito correto de dizer "pare de usar
 * o que já coletou" em vez de simplesmente deixarmos de chamar `gtag`/`fbq`
 * daqui pra frente. E se a pessoa mudar de ideia de novo (reabrindo o
 * banner pelo rodapé) fazemos o caminho inverso.
 */
function aplicarConsentimentoNasTags(estado: EstadoConsentimento): void {
  if (typeof window === "undefined") return;
  if (estado === "recusado") {
    window.gtag?.("consent", "update", {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.fbq?.("consent", "revoke");
  } else if (estado === "aceito") {
    window.gtag?.("consent", "update", {
      ad_storage: "granted",
      analytics_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
    window.fbq?.("consent", "grant");
  }
}

export function Tags() {
  const [habilitado, setHabilitado] = useState(false);

  useEffect(() => {
    const inicial = lerConsentimento();
    if (podeRastrear(inicial)) setHabilitado(true);

    const aoMudarConsentimento = (e: Event) => {
      const novoEstado = (e as CustomEvent<EstadoConsentimento>).detail;
      // Uma vez habilitadas nesta carga de página, as tags continuam
      // montadas — uma recusa posterior é resolvida abaixo via
      // gtag/fbq('consent', ...), não removendo o <Script> da página.
      if (podeRastrear(novoEstado)) setHabilitado(true);
      aplicarConsentimentoNasTags(novoEstado);
    };

    window.addEventListener(EVENTO_CONSENTIMENTO, aoMudarConsentimento);
    return () => window.removeEventListener(EVENTO_CONSENTIMENTO, aoMudarConsentimento);
  }, []);

  if (!habilitado) return null;

  const gtagSrcId = GA4_ID || GOOGLE_ADS_ID;

  return (
    <>
      {/*
        Vercel Web Analytics. Não usa cookie nem identificador persistente e
        não tem env var: o script é servido pela própria borda da Vercel
        (/_vercel/insights/*) e só coleta em deploy da Vercel — em `next dev`
        ele apenas loga em modo debug. Precisa estar habilitado no painel do
        projeto (Analytics → Web Analytics), senão as requisições voltam 404.

        Mora aqui dentro, e não solto no layout, pelos dois motivos que valem
        para todas as outras tags: fica de fora de /admin (só o layout do site
        monta `Tags`) e obedece o mesmo consentimento — recusar no banner
        também para esta medição. Não existe API de `consent` como a do
        gtag/fbq para avisá-la de uma recusa posterior, então o papel de
        `aplicarConsentimentoNasTags` aqui é o `beforeSend`: ele relê o
        consentimento a cada evento e devolve `null` para descartá-lo, o que
        faz a recusa valer na hora, sem depender do próximo carregamento.
      */}
      <Analytics
        beforeSend={(evento) => (podeRastrear(lerConsentimento()) ? evento : null)}
      />

      {gtagSrcId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagSrcId}`}
            strategy="afterInteractive"
          />
          <Script id="rt-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${GA4_ID ? `gtag('config', '${GA4_ID}');` : ""}
              ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
            `}
          </Script>
        </>
      )}

      {META_PIXEL_ID && (
        <Script id="rt-meta-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
