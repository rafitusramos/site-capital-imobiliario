// Palavras-chave do comentário. Módulo puro.

/** NFD, sem diacríticos, minúsculas. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

/** Tokens = sequências contíguas de letras/números (emoji e pontuação separam). */
function tokens(texto: string): string[] {
  return normalizar(texto).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * `null` ou lista vazia = qualquer palavra (mas comentário sem token algum não
 * casa com lista preenchida). Casamento por sequência de tokens inteiros.
 */
export function casaPalavras(comentario: string, palavras: string[] | null): boolean {
  if (!palavras || palavras.length === 0) return true;
  const alvo = tokens(comentario);
  if (alvo.length === 0) return false;
  return palavras.some((p) => {
    const t = tokens(p);
    if (t.length === 0 || t.length > alvo.length) return false;
    for (let i = 0; i <= alvo.length - t.length; i++) {
      if (t.every((x, j) => alvo[i + j] === x)) return true;
    }
    return false;
  });
}
