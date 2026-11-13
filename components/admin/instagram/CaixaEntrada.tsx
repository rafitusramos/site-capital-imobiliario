"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResumoDoDia } from "@/components/admin/instagram/ResumoDoDia";
import { ListaContatos } from "@/components/admin/instagram/ListaContatos";
import { ConversaContato } from "@/components/admin/instagram/ConversaContato";
import type { FiltroCaixa, ItemCaixa, MensagemConversa, ResumoDoDia as Resumo } from "@/lib/queries/admin-instagram";

const SITUACOES: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Todas as situações" },
  { valor: "aguardando_botao", rotulo: "Esperando o botão" },
  { valor: "aguardando_seguir", rotulo: "Não segue ainda" },
  { valor: "link_enviado", rotulo: "Recebeu o link, não abriu" },
  { valor: "link_aberto", rotulo: "Abriu o link" },
  { valor: "3mais", rotulo: "Comentou 3+ vezes" },
  { valor: "falha", rotulo: "Com falha de envio" },
];

const SELECT =
  "min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm text-[var(--tinta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]";

const BASE = "/admin/instagram/";

function montarHref(p: { automacao?: string; situacao?: string; contato?: string }): string {
  const q = new URLSearchParams();
  if (p.automacao) q.set("automacao", p.automacao);
  if (p.situacao) q.set("situacao", p.situacao);
  if (p.contato) q.set("contato", p.contato);
  const s = q.toString();
  return s ? `${BASE}?${s}` : BASE;
}

export function CaixaEntrada({
  resumo,
  itens,
  automacoes,
  filtro,
  contatoId,
  itemSelecionado,
  mensagens,
  temAutomacoes,
}: {
  resumo: Resumo;
  itens: ItemCaixa[];
  automacoes: { id: string; nome: string }[];
  filtro: FiltroCaixa;
  contatoId: string | null;
  itemSelecionado: ItemCaixa | null;
  mensagens: MensagemConversa[];
  temAutomacoes: boolean;
}) {
  const router = useRouter();
  const base = { automacao: filtro.automacaoId, situacao: filtro.situacao };
  const filtrando = Boolean(filtro.automacaoId || filtro.situacao);

  // Trocar filtro devolve à lista: a pessoa aberta pode nem estar no novo recorte.
  function aoFiltrar(campo: "automacao" | "situacao", valor: string) {
    router.push(montarHref({ ...base, [campo]: valor }));
  }

  const hrefLista = montarHref(base);

  return (
    <div className="space-y-4">
      <ResumoDoDia resumo={resumo} />

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="filtro-automacao">
          Filtrar por automação
        </label>
        <select
          id="filtro-automacao"
          className={SELECT}
          value={filtro.automacaoId ?? ""}
          onChange={(e) => aoFiltrar("automacao", e.target.value)}
        >
          <option value="">Todas as automações</option>
          {automacoes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filtro-situacao">
          Filtrar por situação
        </label>
        <select
          id="filtro-situacao"
          className={SELECT}
          value={filtro.situacao ?? ""}
          onChange={(e) => aoFiltrar("situacao", e.target.value)}
        >
          {SITUACOES.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
        {filtrando && (
          <Link href={BASE} className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--jade)] underline">
            Limpar filtros
          </Link>
        )}
      </div>

      {itens.length === 0 && !contatoId ? (
        <div className="rounded-md border border-neutral-200 bg-white p-8 text-center">
          <h2 className="mb-2 text-base font-semibold text-[var(--abissal)]">
            {filtrando ? "Ninguém neste filtro" : "Nenhuma pessoa na caixa ainda"}
          </h2>
          <p className="mx-auto max-w-md text-sm text-neutral-600">
            {filtrando
              ? "Nenhuma pessoa combina com esses filtros. Limpe os filtros para ver todo mundo."
              : "Esta caixa mostra só quem comentou uma palavra-chave em uma publicação com automação ativa. Conversas comuns do Instagram continuam no app."}
          </p>
          {!filtrando && !temAutomacoes && (
            <Link
              href="/admin/instagram/automacoes/nova/"
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--abissal)] px-5 text-sm font-medium text-[var(--branco)] transition hover:opacity-90"
            >
              Criar a primeira automação
            </Link>
          )}
        </div>
      ) : (
        <div className="flex min-h-[28rem] overflow-hidden rounded-md border border-neutral-200 bg-white md:h-[calc(100dvh-20rem)] md:min-h-[24rem]">
          <div
            className={`w-full shrink-0 overflow-y-auto border-neutral-200 md:block md:w-[36%] md:border-r ${
              contatoId ? "hidden" : "block"
            }`}
          >
            {itens.length === 0 ? (
              <p className="p-4 text-sm text-neutral-600">Ninguém neste filtro.</p>
            ) : (
              <ListaContatos
                itens={itens}
                selecionadoId={contatoId}
                hrefDe={(id) => montarHref({ ...base, contato: id })}
              />
            )}
          </div>
          <div className={`min-w-0 flex-1 flex-col md:flex ${contatoId ? "flex" : "hidden"}`}>
            {contatoId ? (
              <ConversaContato key={contatoId} item={itemSelecionado} mensagens={mensagens} hrefLista={hrefLista} />
            ) : (
              <p className="m-auto p-6 text-sm text-neutral-600">Escolha uma pessoa para ver a conversa.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
