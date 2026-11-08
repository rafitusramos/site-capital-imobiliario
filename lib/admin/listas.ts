/**
 * Busca, filtro de status e ordenação das listas do admin (posts e imóveis).
 * Puro e sem dependência de React: o volume é de dezenas de linhas, então tudo
 * roda no cliente, sem paginação no servidor.
 */

export type Direcao = "asc" | "desc";
export type Ordem = { coluna: string; direcao: Direcao } | null;

export type ConsultaLista = {
  busca: string;
  /** "todos" desliga o filtro. */
  status: string;
  ordem: Ordem;
};

export type ConfigLista<T> = {
  /** Textos em que a busca procura (título, slug...). */
  textos: (item: T) => string[];
  status: (item: T) => string;
  /** Valor de cada coluna ordenável; null/undefined sempre vão para o fim. */
  ordenadores: Record<string, (item: T) => string | number | null | undefined>;
};

/** Minúsculas, sem acento e sem espaço nas pontas — "Consórcio" casa com "consorcio". */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function comparar(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return normalizarBusca(String(a)).localeCompare(normalizarBusca(String(b)), "pt-BR");
}

export function consultarLista<T>(itens: T[], consulta: ConsultaLista, config: ConfigLista<T>): T[] {
  const termo = normalizarBusca(consulta.busca);
  let resultado = itens.filter((item) => {
    if (consulta.status !== "todos" && config.status(item) !== consulta.status) return false;
    if (!termo) return true;
    return config.textos(item).some((texto) => normalizarBusca(texto).includes(termo));
  });

  const { ordem } = consulta;
  const extrair = ordem ? config.ordenadores[ordem.coluna] : undefined;
  if (ordem && extrair) {
    const sinal = ordem.direcao === "asc" ? 1 : -1;
    resultado = [...resultado].sort((x, y) => {
      const vx = extrair(x);
      const vy = extrair(y);
      const nx = vx === null || vx === undefined;
      const ny = vy === null || vy === undefined;
      if (nx && ny) return 0;
      if (nx) return 1;
      if (ny) return -1;
      return sinal * comparar(vx, vy);
    });
  }
  return resultado;
}

/** Clique no cabeçalho: coluna nova → asc; mesma coluna → desc; de novo → sem ordenação. */
export function alternarOrdenacao(atual: Ordem, coluna: string): Ordem {
  if (!atual || atual.coluna !== coluna) return { coluna, direcao: "asc" };
  if (atual.direcao === "asc") return { coluna, direcao: "desc" };
  return null;
}
