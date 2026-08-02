import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/estado.css";

export const metadata: Metadata = {
  title: "Página não encontrada · RT Capital Imobiliário",
  robots: { index: false, follow: false },
};

// Atende o notFound() de app/(site)/blog/[slug]/page.tsx e
// app/(site)/imoveis/[slug]/page.tsx. Renderiza dentro de
// app/(site)/layout.tsx, então já vem com nav e rodapé.
export default function NotFound() {
  return (
    <section className="hero estado">
      <div className="wrap">
        <div className="eyebrow">Erro 404</div>
        <h1>Este endereço não existe.</h1>
        <p className="sub">
          A página que você procurou saiu do ar, mudou de lugar ou nunca existiu. Os imóveis e os
          artigos continuam todos aqui.
        </p>
        <Link className="cta" href="/imoveis/">
          Ver imóveis disponíveis
        </Link>
        <div className="estado-links">
          <Link href="/blog/">Ler o blog</Link>
          <Link href="/">Início</Link>
        </div>
      </div>
    </section>
  );
}
