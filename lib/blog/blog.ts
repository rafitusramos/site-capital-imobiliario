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

// O markdown dos artigos começa com "# Título", que duplicaria o <h1> que a
// página já renderiza a partir de `posts.title`. Aqui esse H1 é descartado e o
// primeiro parágrafo é separado do resto, para a capa entrar entre os dois.
//
// `restante` é uma fatia literal do original (não um re-join), então blocos que
// contêm linha em branco — código cercado, listas soltas — chegam intactos ao
// ReactMarkdown.
export function dividirConteudo(content: string): {
  primeiroParagrafo: string;
  restante: string;
} {
  const semH1 = content.replace(/^\s*#\s+[^\n]*(\r?\n)+/, "");
  const fimDoPrimeiro = semH1.search(/\r?\n[ \t]*\r?\n/);

  if (fimDoPrimeiro === -1) {
    return { primeiroParagrafo: semH1.trim(), restante: "" };
  }

  // Com a capa entrando entre os dois blocos, uma linha divisória logo no
  // início do restante ficaria encostada na imagem, separando o que a própria
  // imagem já separa. Descartada.
  const restante = semH1
    .slice(fimDoPrimeiro)
    .replace(/^\s+/, "")
    .replace(/^(-{3,}|\*{3,}|_{3,})[ \t]*(\r?\n\s*)/, "");

  return {
    primeiroParagrafo: semH1.slice(0, fimDoPrimeiro).trim(),
    restante,
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
