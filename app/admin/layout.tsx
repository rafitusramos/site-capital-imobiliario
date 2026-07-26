import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Libre_Caslon_Display } from "next/font/google";
import "../globals.css";
import "./admin.css";

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

// Só para o "RT" do selo da marca (components/admin/Marca.tsx) — mesma fonte
// de display usada em app/(site)/layout.tsx, pra marca ficar idêntica.
const libreCaslonDisplay = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--display",
});

export const metadata: Metadata = {
  title: "Admin · RT Capital Imobiliário",
  robots: { index: false, follow: false },
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
        className={`${archivo.variable} ${ibmPlexMono.variable} ${libreCaslonDisplay.variable} min-h-screen bg-[var(--marfim)] text-[var(--tinta)] antialiased [font-family:var(--sans),sans-serif]`}
      >
        {children}
      </body>
    </html>
  );
}
