export type FaqItem = { pergunta: string; resposta: string };

/**
 * FAQPage a partir dos MESMOS itens que a página renderiza como <details>.
 * Sem itens devolve null: FAQPage vazio é erro de rich result.
 */
export function montarFaqPage(itens: readonly FaqItem[]) {
  if (itens.length === 0) return null;
  return {
    "@type": "FAQPage" as const,
    mainEntity: itens.map((item) => ({
      "@type": "Question" as const,
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer" as const, text: item.resposta },
    })),
  };
}
