import Link from "next/link";
import { dataCurta, etiquetaDaSituacao, type TomEtiqueta } from "@/lib/instagram/etiquetas";
import type { ItemCaixa } from "@/lib/queries/admin-instagram";

// Tom da etiqueta -> variáveis do admin. `--aviso` nunca em texto.
const TOM_ETIQUETA: Record<TomEtiqueta, string> = {
  neutro: "bg-neutral-100 text-neutral-700",
  andamento: "bg-[#f3ecdf] text-[var(--bronze)]",
  sucesso: "bg-[#e3f0ea] text-[var(--jade)]",
  erro: "bg-[#f6e4e0] text-[var(--erro)]",
};

export function nomeDoContato(c: ItemCaixa["contato"]): string {
  return c.nome || (c.username ? `@${c.username}` : "Contato sem nome");
}

export function iniciais(c: ItemCaixa["contato"]): string {
  const base = (c.nome || c.username || "?").replace(/^@/, "").trim();
  return base.slice(0, 1).toUpperCase();
}

export function EtiquetaSituacao({ item }: { item: ItemCaixa }) {
  const e = etiquetaDaSituacao(item);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TOM_ETIQUETA[e.tom]}`}>
      {e.texto}
    </span>
  );
}

export function ListaContatos({
  itens,
  selecionadoId,
  hrefDe,
}: {
  itens: ItemCaixa[];
  selecionadoId: string | null;
  hrefDe: (contatoId: string) => string;
}) {
  return (
    <ul aria-label="Pessoas na caixa de entrada" className="divide-y divide-neutral-100">
      {itens.map((i) => {
        const ativo = i.contato.id === selecionadoId;
        return (
          <li key={i.contato.id}>
            <Link
              href={hrefDe(i.contato.id)}
              aria-current={ativo ? "true" : undefined}
              className={`block min-h-11 px-4 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--jade)] ${
                ativo ? "bg-[var(--marfim)]" : "hover:bg-neutral-50"
              }`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold text-[var(--abissal)]">{nomeDoContato(i.contato)}</span>
                <span className="shrink-0 text-xs tabular-nums text-neutral-500">{dataCurta(i.atualizadoEm)}</span>
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <EtiquetaSituacao item={i} />
                <span className="truncate text-xs text-neutral-500">{i.automacaoNome}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
