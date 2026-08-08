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

// Canonical do artigo. NUNCA devolve vazio: sem valor explícito no banco, a
// página é canônica de si mesma.
//
// `canonical_url` (migration 001) é coluna opcional e não tem campo nem no
// admin nem no frontmatter de importação — na prática só os posts migrados do
// site antigo a têm preenchida. Enquanto o metadata da página a usava direto,
// num ternário que caía em `undefined`, todo post criado depois da migração
// era servido sem <link rel="canonical"> nenhum, e o Google escolheu a
// canônica por conta própria — agrupando artigos de tema parecido e deixando
// de indexar o resto ("Cópia — Google escolheu canônica diferente" no Search
// Console). A barra final acompanha `trailingSlash: true` do next.config.ts:
// canonical sem barra apontaria para a URL que redireciona, não para a final.
export function canonicalDoArtigo(
  canonicalUrl: string | null | undefined,
  slug: string,
): string {
  return canonicalUrl?.trim() || `/blog/${slug}/`;
}
