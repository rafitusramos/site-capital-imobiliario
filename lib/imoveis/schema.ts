import { SITE_URL } from "@/lib/site";
import type { ImovelStatus } from "@/types/database";

// Dados estruturados da página de imóvel (docs/handoff-schema-offers-imoveis.md).
//
// O Google exige que todo `Product` traga ao menos um entre `offers`, `review`
// e `aggregateRating`. Imóvel não tem nota nem resenha, então sobra `offers` —
// e um `Product` sem ele é ERRO CRÍTICO no teste de resultados aprimorados,
// não aviso. Este módulo é puro de propósito: é a única forma de travar em
// teste um bloco que, quando quebra, não quebra nada visível na página.

/** Disponibilidade schema.org, sem o prefixo de URL. */
const DISPONIBILIDADE = {
  preOrder: "https://schema.org/PreOrder",
  inStock: "https://schema.org/InStock",
  soldOut: "https://schema.org/SoldOut",
  limitada: "https://schema.org/LimitedAvailability",
} as const;

// Fase do empreendimento → disponibilidade. Imóvel que ainda não foi entregue
// é venda antecipada: quem compra na planta não recebe a chave hoje. Só
// "pronto" é InStock. Os slugs espelham os seeds de `imovel_fases`
// (migration 011) — mudou lá, muda aqui.
const DISPONIBILIDADE_POR_FASE: Record<string, string> = {
  pre_lancamento: DISPONIBILIDADE.preOrder,
  lancamento: DISPONIBILIDADE.preOrder,
  em_construcao: DISPONIBILIDADE.preOrder,
  pronto: DISPONIBILIDADE.inStock,
};

/**
 * Disponibilidade a partir do status comercial e da fase de obra.
 *
 * O status tem precedência: um imóvel vendido não volta a ser PreOrder por
 * estar em construção. Hoje `getImovelBySlug` só serve `status = "ativo"` —
 * vendido, reservado e inativo devolvem 404 e nunca chegam aqui. Os ramos
 * existem porque a regra de negócio é essa; se um dia `reservado` passar a
 * ser publicado, a marcação já sai correta em vez de anunciar como disponível
 * o que não está.
 */
export function disponibilidadeSchema(status: ImovelStatus, faseSlug: string): string {
  if (status === "vendido" || status === "inativo") return DISPONIBILIDADE.soldOut;
  if (status === "reservado") return DISPONIBILIDADE.limitada;
  return DISPONIBILIDADE_POR_FASE[faseSlug] ?? DISPONIBILIDADE.inStock;
}

/** O mínimo que o offer precisa saber do imóvel — mantém a função testável. */
export type ImovelParaOffer = {
  slug: string;
  status: ImovelStatus;
  fase: { slug: string };
  valor_a_partir_de: number | null;
  valor_sob_consulta: boolean;
  tipologias: { valor_a_partir_de: number | null }[];
};

export type OfferSchema = {
  "@type": "Offer" | "AggregateOffer";
  priceCurrency: "BRL";
  availability: string;
  url: string;
  price?: number;
  lowPrice?: number;
  highPrice?: number;
  offerCount?: number;
};

/**
 * Monta o `offers` do imóvel, ou `null` quando não há preço publicável.
 *
 * `AggregateOffer` só quando existe faixa real (teto acima do piso); com um
 * preço só, `Offer` simples — um AggregateOffer cujo lowPrice e highPrice são
 * iguais descreve uma faixa que não existe.
 *
 * `priceValidUntil` fica de fora de propósito: não há regra de validade de
 * tabela no cadastro, e data passada nesse campo derruba o rich result. Campo
 * ausente é melhor que campo vencido.
 */
export function montarOfferSchema(imovel: ImovelParaOffer): OfferSchema | null {
  // "Sob consulta" tem precedência sobre o valor, igual à página: quando
  // marcado, nem o hero, nem a tabela de tipologias, nem a barra fixa mostram
  // preço. Publicar no JSON-LD um número que a página inteira esconde
  // contraria a política de dados estruturados do Google, que exige marcação
  // representativa do conteúdo visível — e ainda entregaria de graça, na SERP,
  // o preço que o cadastro decidiu não expor.
  if (imovel.valor_sob_consulta || !imovel.valor_a_partir_de) return null;

  const piso = imovel.valor_a_partir_de;
  const base = {
    priceCurrency: "BRL",
    availability: disponibilidadeSchema(imovel.status, imovel.fase.slug),
    url: `${SITE_URL}/imoveis/${imovel.slug}/`,
  } as const;

  const precosTipologias = imovel.tipologias
    .map((tipologia) => tipologia.valor_a_partir_de)
    .filter((valor): valor is number => typeof valor === "number");
  const teto = precosTipologias.length > 0 ? Math.max(...precosTipologias) : null;

  // Teto igual ou abaixo do piso não é faixa: um highPrice menor que o
  // lowPrice reprova o rich result, e um igual não informa nada.
  if (teto === null || teto <= piso) {
    return { "@type": "Offer", price: piso, ...base };
  }

  return {
    "@type": "AggregateOffer",
    lowPrice: piso,
    highPrice: teto,
    offerCount: imovel.tipologias.length,
    ...base,
  };
}
