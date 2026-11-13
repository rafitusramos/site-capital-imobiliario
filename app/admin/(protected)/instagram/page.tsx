import type { Metadata } from "next";
import { CaixaEntrada } from "@/components/admin/instagram/CaixaEntrada";
import {
  caixaDeEntrada,
  conversa,
  listarAutomacoes,
  resumoDoDia,
  type FiltroCaixa,
  type ItemCaixa,
} from "@/lib/queries/admin-instagram";

export const metadata: Metadata = { title: "Instagram · Admin" };
export const dynamic = "force-dynamic";

const SITUACOES_VALIDAS = new Set(["aguardando_botao", "aguardando_seguir", "link_enviado", "link_aberto", "falha", "3mais"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function um(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CaixaDeEntradaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const automacaoParam = um(sp.automacao);
  const situacaoParam = um(sp.situacao);
  const contatoParam = um(sp.contato);

  const filtro: FiltroCaixa = {
    automacaoId: automacaoParam && UUID.test(automacaoParam) ? automacaoParam : undefined,
    situacao: situacaoParam && SITUACOES_VALIDAS.has(situacaoParam) ? (situacaoParam as FiltroCaixa["situacao"]) : undefined,
  };
  const contatoId = contatoParam && UUID.test(contatoParam) ? contatoParam : null;

  const [automacoes, itens, resumo, mensagens] = await Promise.all([
    listarAutomacoes(),
    caixaDeEntrada(filtro),
    resumoDoDia(filtro.automacaoId),
    contatoId ? conversa(contatoId) : Promise.resolve([]),
  ]);

  // A pessoa aberta pode estar fora do recorte do filtro: busca na caixa inteira.
  let selecionado: ItemCaixa | null = null;
  if (contatoId) {
    selecionado =
      itens.find((i) => i.contato.id === contatoId) ??
      (await caixaDeEntrada({})).find((i) => i.contato.id === contatoId) ??
      null;
  }

  return (
    <div>
      <h1 className="sr-only">Caixa de entrada do Instagram</h1>
      <CaixaEntrada
        resumo={resumo}
        itens={itens}
        automacoes={automacoes.map((a) => ({ id: a.id, nome: a.nome }))}
        filtro={filtro}
        contatoId={contatoId}
        itemSelecionado={selecionado}
        mensagens={mensagens}
        temAutomacoes={automacoes.length > 0}
      />
    </div>
  );
}
