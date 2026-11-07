import type { Metadata } from "next";
// Fontes hospedadas em app/fonts (o "RT" do selo da marca usa --display, a soma
// de valores do CRM usa --geologica).
import { archivo, geologica, ibmPlexMono, libreCaslonDisplay } from "@/app/fonts";
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin · RT Capital Imobiliário",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

// Root layout independente do app/(site)/layout.tsx: o admin não usa a nav, o
// rodapé nem o design system (styles/lp.css) do site público — só o Tailwind
// utilitário + a paleta mínima de ./admin.css.
export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${archivo.variable} ${ibmPlexMono.variable} ${libreCaslonDisplay.variable} ${geologica.variable} min-h-screen bg-[var(--marfim)] text-[var(--tinta)] antialiased [font-family:var(--sans),sans-serif]`}
      >
        {children}
      </body>
    </html>
  );
}
