"use client";

import "@/styles/estado.css";

// Client Component: não exporta metadata. Limite de erro do route group
// (site) inteiro — renderiza dentro de app/(site)/layout.tsx, com nav e
// rodapé.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="hero estado">
      <div className="wrap">
        <div className="eyebrow">Falha ao carregar</div>
        <h1>Não foi possível carregar esta página.</h1>
        <p className="sub">
          Algo falhou do nosso lado ao montar esta página. Tentar de novo costuma resolver.
        </p>
        <button type="button" className="cta" onClick={() => reset()}>
          Tentar de novo
        </button>
        {error.digest ? <p className="estado-codigo">Código: {error.digest}</p> : null}
      </div>
    </section>
  );
}
