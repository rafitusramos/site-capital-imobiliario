import type { Metadata } from "next";
import { libreCaslonDisplay, libreCaslonText, archivo, ibmPlexMono } from "@/app/fonts";
import "../globals.css";
import "../../styles/lp.css";
import "../../styles/blog.css";
import "../../styles/imoveis.css";
import { SITE_URL } from "@/lib/site";
import { SiteNav } from "@/components/nav/SiteNav";
import { RevealOnScroll } from "@/components/efeitos/RevealOnScroll";
import { NEGOCIO_NODE, RAFAEL_NODE } from "@/lib/seo/negocio";
import { Tags } from "@/components/analytics/Tags";
import { CapturaAtribuicao } from "@/components/analytics/CapturaAtribuicao";
import { BannerConsentimento } from "@/components/consentimento/BannerConsentimento";
import { AbrirPreferenciasCookies } from "@/components/consentimento/AbrirPreferenciasCookies";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "RT Capital Imobiliário",
  icons: {
    icon: "/favicon.svg",
  },
};

// O grafo do negócio (NEGOCIO_NODE + RAFAEL_NODE) é declarado aqui, no
// layout raiz, e não em cada página — porque várias páginas independentes
// (financiamento, home_equity, sobre, e agora o blog) referenciam esses
// nós por "@id" (provider, worksFor, author, publisher). Declarando os
// dois nós uma única vez, em toda página do site, qualquer referência a
// "#negocio" ou "#rafael" resolve dentro do mesmo documento, em vez de
// ficar pendurada ou duplicada. Ver lib/seo/negocio.ts.
const negocioGraphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [NEGOCIO_NODE, RAFAEL_NODE],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${libreCaslonDisplay.variable} ${libreCaslonText.variable} ${archivo.variable} ${ibmPlexMono.variable}`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(negocioGraphJsonLd),
          }}
        />
        <SiteNav />
        <RevealOnScroll />
        <CapturaAtribuicao />
        <Tags />
        <BannerConsentimento />

        {children}

        <footer>
          <div className="wrap">
            <a
              className="marca marca-footer"
              href="#topo"
              aria-label="Rafael Teixeira, Capital Imobiliário — topo"
            >
              <span className="selo" aria-hidden="true">
                RT
              </span>
              <span className="nome">
                Rafael Teixeira
                <small>Capital Imobiliário</small>
              </span>
            </a>
            <div className="footer-email">contato@rtcapitalimobiliario.com.br</div>
            <div className="footer-legal">
              <a href="/politica-de-privacidade/">Política de Privacidade</a>
              <span aria-hidden="true">·</span>
              <a href="/termos-de-uso/">Termos de Uso</a>
              <span aria-hidden="true">·</span>
              <AbrirPreferenciasCookies />
            </div>
            <div className="footer-disclaimer">
              Atuação como correspondente bancário na forma da Res. CMN
              4.935/2021 — este material tem caráter informativo e não
              constitui oferta de crédito. O vínculo como Assessor de
              Investimentos (AAI), sob a Resolução CVM 178 e vinculado à XP
              Investimentos, é uma atividade regulatória distinta, não
              comercializada por meio deste site.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
