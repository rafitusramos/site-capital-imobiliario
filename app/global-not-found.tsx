import type { Metadata } from "next";
import { Archivo, Libre_Caslon_Display } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "@/styles/lp.css";
import "@/styles/estado.css";

// Página de última instância: qualquer URL que não casa com rota nenhuma
// (nem app/(site), nem app/admin). Como o projeto tem dois root layouts, não
// existe not-found componível único — só duas fontes carregadas aqui, essa
// tela não merece o peso das quatro do site.
const libreCaslonDisplay = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--display",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--sans",
});

export const metadata: Metadata = {
  title: "Página não encontrada · RT Capital Imobiliário",
};

export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body className={`${libreCaslonDisplay.variable} ${archivo.variable}`}>
        <section className="hero estado estado-cheio">
          <div className="wrap">
            <div className="eyebrow">Erro 404</div>
            <h1>Este endereço não existe.</h1>
            <p className="sub">
              O endereço que você digitou não corresponde a nenhuma página deste site.
            </p>
            <Link className="cta" href="/">
              Ir para o início
            </Link>
          </div>
        </section>
      </body>
    </html>
  );
}
