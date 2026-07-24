const COR_POR_CATEGORIA_SLUG: Record<string, string> = {
  financiamento: "var(--jade)",
  "home-equity": "var(--jade)",
  consorcio: "var(--bronze)",
  imoveis: "var(--abissal)",
};

export function corCategoria(slug?: string | null): string {
  return (slug && COR_POR_CATEGORIA_SLUG[slug]) || "var(--areia)";
}

const CTA_ROTULO_POR_CATEGORIA: Record<string, string> = {
  Financiamento: "financiamento",
  "Home Equity": "home equity",
  Consórcio: "consórcio",
};

export function ctaDoArtigo(categoriaNome?: string | null): {
  titulo: string;
  botao: string;
} {
  const rotulo = categoriaNome
    ? CTA_ROTULO_POR_CATEGORIA[categoriaNome]
    : undefined;

  if (rotulo) {
    return {
      titulo: `Vale simular o seu ${rotulo}?`,
      botao: `Simular meu ${rotulo} →`,
    };
  }
  return {
    titulo: "Vale conhecer nossas soluções de crédito?",
    botao: "Conhecer as soluções →",
  };
}

export function formatarData(iso: string | null): string {
  if (!iso) return "";
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(iso));

  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${obter("day")}-${obter("month")}-${obter("year")}`;
}
