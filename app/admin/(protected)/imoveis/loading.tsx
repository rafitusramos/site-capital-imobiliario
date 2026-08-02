/**
 * Esqueleto da tabela de empreendimentos — mesma densidade/largura do
 * conteúdo real (components/admin/TabelaImoveis.tsx): cabeçalho de 6 colunas
 * (Empreendimento, Cidade, Tipo, Fase, Status, Ações) e linhas com a mesma
 * altura. Padrão de app/admin/(protected)/crm/[origem]/loading.tsx.
 */
export default function CarregandoImoveis() {
  const linhas = Array.from({ length: 6 });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between" aria-hidden="true">
        <div className="h-6 w-48 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-black/5 motion-reduce:animate-none" />
      </div>

      <div className="rounded-lg border border-black/10 bg-white" aria-hidden="true">
        <div className="hidden border-b border-black/10 bg-neutral-50 px-4 py-3 sm:grid sm:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-16 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
          ))}
        </div>
        <ul role="list" className="divide-y divide-black/5">
          {linhas.map((_, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4 sm:px-4 sm:py-3"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-black/5 motion-reduce:animate-none" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-black/5 motion-reduce:animate-none" />
              <div className="h-4 w-20 animate-pulse rounded bg-black/5 motion-reduce:animate-none" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-black/5 motion-reduce:animate-none" />
              <div className="h-4 w-16 animate-pulse rounded bg-black/5 motion-reduce:animate-none" />
            </li>
          ))}
        </ul>
      </div>
      <span className="sr-only">Carregando os empreendimentos…</span>
    </div>
  );
}
