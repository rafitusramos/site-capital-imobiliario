/**
 * Apoio ao aviso de "alterações não salvas" dos editores do admin.
 */

/** JSON com chaves ordenadas; `undefined` some, então ausente e undefined são equivalentes. */
function serializar(valor: unknown): string {
  return JSON.stringify(valor, (_chave, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
    }
    return v;
  });
}

/** Compara o estado salvo com o atual, por valor e sem depender da ordem das chaves. */
export function houveAlteracao(inicial: unknown, atual: unknown): boolean {
  return serializar(inicial) !== serializar(atual);
}

export type CliqueEmLink = {
  href: string | null;
  /** Origem do site (location.origin). */
  origem: string;
  /** Caminho atual com query (location.pathname + location.search). */
  atual: string;
  alvo: string;
  download: boolean;
  /** Ctrl/Cmd/Shift/Alt ou botão do meio: o navegador abre fora desta aba. */
  modificador: boolean;
};

/**
 * Se o clique num `<a>` navega para outra página da mesma origem, devolve o
 * destino (caminho + query + hash) para o guard confirmar; senão null e o clique
 * segue normal. Cobre `<Link>` do Next e `<a>` simples, pois olha o href final.
 */
export function destinoInternoDoClique(clique: CliqueEmLink): string | null {
  const { href, origem, atual, alvo, download, modificador } = clique;
  if (!href || download || modificador) return null;
  if (alvo && alvo !== "_self") return null;
  let url: URL;
  try {
    url = new URL(href, origem + atual);
  } catch {
    return null;
  }
  if (url.origin !== origem) return null;
  const paginaAtual = new URL(atual, origem);
  if (url.pathname === paginaAtual.pathname && url.search === paginaAtual.search) return null;
  return url.pathname + url.search + url.hash;
}
