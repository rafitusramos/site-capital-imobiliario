"use client";

// Último recurso: erro no próprio root layout ((site) ou admin). Sem import
// de CSS nem next/font — se o layout quebrou, a folha de estilo pode ser
// justamente o que quebrou. Só style inline com hex literal.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A241C",
          color: "#FCFAF4",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <title>O site não conseguiu carregar.</title>
        <div style={{ maxWidth: "440px", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              fontSize: "32px",
              lineHeight: 1.2,
              margin: "0 0 16px",
            }}
          >
            O site não conseguiu carregar.
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#C9BFAC", margin: "0 0 24px" }}>
            Recarregue a página. Se o problema continuar, tente de novo em alguns minutos.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#8A6C48",
              color: "#FCFAF4",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
              fontSize: "15px",
              padding: "14px 28px",
              minHeight: "48px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
          {error.digest ? (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#C9BFAC",
                marginTop: "20px",
              }}
            >
              Código: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
