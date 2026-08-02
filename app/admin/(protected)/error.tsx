"use client";

// Idioma visual do admin: Tailwind puro, quieto, funcional — espelha
// components/admin/crm/EstadoVazio.tsx. Client Component: não exporta
// metadata.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-black/10 px-6 py-10 text-center">
      <span className="font-mono text-xs text-neutral-400">Erro</span>
      <p className="mt-2 text-sm font-medium text-[var(--abissal)]">Não foi possível carregar</p>
      <p className="mt-1 text-sm text-neutral-500">
        Algo falhou ao buscar estes dados. Tentar de novo costuma resolver.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 min-h-[44px] rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840]"
      >
        Tentar de novo
      </button>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-neutral-400">Código: {error.digest}</p>
      ) : null}
    </div>
  );
}
