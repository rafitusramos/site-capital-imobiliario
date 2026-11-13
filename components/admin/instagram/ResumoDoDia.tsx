import type { ResumoDoDia as Resumo } from "@/lib/queries/admin-instagram";

// Números de hoje (dia em São Paulo, calculado no RPC ig_resumo_do_dia).
// Falhas só ganham a cor de erro quando existem; o rótulo diz o mesmo, então
// a cor nunca é o único sinal.
export function ResumoDoDia({ resumo }: { resumo: Resumo }) {
  const itens = [
    { n: resumo.comentarios, rotulo: resumo.comentarios === 1 ? "comentário" : "comentários" },
    { n: resumo.linksEnviados, rotulo: resumo.linksEnviados === 1 ? "recebeu o link" : "receberam o link" },
    { n: resumo.linksAbertos, rotulo: resumo.linksAbertos === 1 ? "abriu" : "abriram" },
  ];
  const temFalha = resumo.falhas > 0;
  return (
    <section aria-label="Resumo de hoje" className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <h2 className="text-sm font-semibold text-[var(--abissal)]">Hoje</h2>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        {itens.map((i) => (
          <div key={i.rotulo} className="flex items-baseline gap-1.5">
            <dd className="text-xl font-semibold tabular-nums text-[var(--abissal)]">{i.n}</dd>
            <dt className="text-sm text-neutral-600">{i.rotulo}</dt>
          </div>
        ))}
        <div className="flex items-baseline gap-1.5">
          <dd
            className={`text-xl font-semibold tabular-nums ${temFalha ? "text-[var(--erro)]" : "text-[var(--abissal)]"}`}
          >
            {resumo.falhas}
          </dd>
          <dt className={`text-sm ${temFalha ? "font-medium text-[var(--erro)]" : "text-neutral-600"}`}>
            {resumo.falhas === 1 ? "falha de envio" : "falhas de envio"}
          </dt>
        </div>
      </dl>
    </section>
  );
}
