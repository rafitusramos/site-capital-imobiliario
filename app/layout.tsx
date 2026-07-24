import type { Metadata } from "next";
import {
  Libre_Caslon_Display,
  Libre_Caslon_Text,
  Archivo,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import "../styles/lp.css";
import "../styles/blog.css";
import { SITE_URL, CIDADES_ATENDIDAS } from "@/lib/site";

const libreCaslonDisplay = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--display",
});

const libreCaslonText = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--texto",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "RT Capital Imobiliário",
  icons: {
    icon: "/favicon.svg",
  },
};

const realEstateAgentJsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "RT Capital Imobiliário",
  url: SITE_URL,
  areaServed: CIDADES_ATENDIDAS.map((cidade) => `${cidade}, SP`),
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
            __html: JSON.stringify(realEstateAgentJsonLd),
          }}
        />
        <nav className="topbar">
          <div className="wrap">
            <a
              className="marca"
              href="/"
              aria-label="Rafael Teixeira, Capital Imobiliário — início"
            >
              <span className="selo" aria-hidden="true">
                RT
              </span>
              <span className="nome">
                Rafael Teixeira
                <small>Capital Imobiliário</small>
              </span>
            </a>
            <div className="topbar-nav">
              <a className="nav-link" href="/">
                Início
              </a>
              <div className="nav-drop">
                <button
                  className="nav-link nav-drop-btn"
                  type="button"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  Soluções de Crédito
                </button>
                <div className="nav-drop-menu">
                  <a href="/financiamento/">
                    Financiamento
                    <small>Compra do imóvel · SBPE</small>
                  </a>
                  <a href="/home_equity/">
                    Home Equity
                    <small>Crédito com garantia de imóvel</small>
                  </a>
                </div>
              </div>
              <a className="nav-link ativo" href="/blog/" aria-current="page">
                Blog
              </a>
              <a className="nav-link" href="/sobre.html">
                Sobre
              </a>
            </div>
          </div>
        </nav>

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
