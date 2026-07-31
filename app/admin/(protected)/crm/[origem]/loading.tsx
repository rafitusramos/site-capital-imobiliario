/**
 * Esqueleto do quadro (docs/crm-spec.md §6): mesma densidade/largura das
 * colunas reais, para a página não "piscar" em branco enquanto
 * `getQuadro`/`getContagensPorEtapa`/`getDominios` resolvem.
 */
export default function CarregandoQuadro() {
  const colunas = Array.from({ length: 6 });
  const cardsPorColuna = [3, 2, 4, 1, 2, 3];

  return (
    <div>
      <div className="mb-4 h-10 w-full max-w-3xl animate-pulse rounded-md bg-black/5 motion-reduce:animate-none" aria-hidden="true" />
      <div className="flex gap-4 overflow-x-auto pb-4" aria-hidden="true">
        {colunas.map((_, i) => (
          <div key={i} className="flex w-[304px] flex-none flex-col rounded-lg border border-black/5 bg-black/[0.02] p-3">
            <div className="mb-3 space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
              <div className="h-4 w-16 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: cardsPorColuna[i] }).map((__, j) => (
                <div key={j} className="h-32 animate-pulse rounded-md border border-black/5 bg-white motion-reduce:animate-none" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando o quadro…</span>
    </div>
  );
}
