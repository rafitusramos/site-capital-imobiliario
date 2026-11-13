// Regras puras do campo de palavras-chave em chips (editor de automação).
// Sem React, sem Supabase. A validação por palavra continua no zod
// (lib/validations/instagram.ts); aqui só se apara, separa e deduplica.
import { normalizar } from "@/lib/instagram/palavras";

const SEPARADOR = /[,\n\r]+/;

/** Separa por vírgula/quebra de linha, apara, ignora vazias e duplicadas (sem caixa/acento). */
export function adicionarPalavras(lista: string[], texto: string): string[] {
  const vistas = new Set(lista.map(normalizar));
  const resultado = [...lista];
  for (const bruta of texto.split(SEPARADOR)) {
    const palavra = bruta.trim();
    if (palavra.length === 0) continue;
    const chave = normalizar(palavra);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    resultado.push(palavra);
  }
  return resultado;
}

/** Tira a palavra do índice; índice fora da lista devolve a lista igual. */
export function removerPalavra(lista: string[], indice: number): string[] {
  if (indice < 0 || indice >= lista.length) return lista;
  return lista.filter((_, i) => i !== indice);
}

/**
 * Palavras de todas as automações, da mais usada para a menos usada (empate:
 * ordem alfabética pt-BR). Conta por forma normalizada, uma vez por automação,
 * e devolve a grafia mais frequente (empate: a primeira vista).
 */
export function rankingDePalavras(listas: (string[] | null)[]): string[] {
  const grupos = new Map<string, { usos: number; grafias: Map<string, number> }>();
  for (const lista of listas) {
    if (!lista) continue;
    const naAutomacao = new Set<string>();
    for (const bruta of lista) {
      const palavra = bruta.trim();
      if (palavra.length === 0) continue;
      const chave = normalizar(palavra);
      let g = grupos.get(chave);
      if (!g) {
        g = { usos: 0, grafias: new Map() };
        grupos.set(chave, g);
      }
      g.grafias.set(palavra, (g.grafias.get(palavra) ?? 0) + 1);
      if (!naAutomacao.has(chave)) {
        naAutomacao.add(chave);
        g.usos += 1;
      }
    }
  }
  const itens = Array.from(grupos.values()).map((g) => {
    let melhor = "";
    let max = 0;
    for (const [grafia, n] of g.grafias) {
      if (n > max) {
        melhor = grafia;
        max = n;
      }
    }
    return { palavra: melhor, usos: g.usos };
  });
  itens.sort((a, b) => b.usos - a.usos || a.palavra.localeCompare(b.palavra, "pt-BR"));
  return itens.map((i) => i.palavra);
}

/**
 * Sugestões para o texto digitado: quem começa com ele vem antes de quem só o
 * contém; a ordem do ranking se mantém dentro de cada grupo. Vazio = sem sugestão.
 */
export function sugerirPalavras(
  ranking: string[],
  digitado: string,
  escolhidas: string[],
  limite = 6,
): string[] {
  const alvo = normalizar(digitado.trim());
  if (alvo.length === 0) return [];
  const jaEscolhidas = new Set(escolhidas.map(normalizar));
  const comecam: string[] = [];
  const contem: string[] = [];
  for (const palavra of ranking) {
    const n = normalizar(palavra);
    if (jaEscolhidas.has(n)) continue;
    if (n.startsWith(alvo)) comecam.push(palavra);
    else if (n.includes(alvo)) contem.push(palavra);
  }
  return [...comecam, ...contem].slice(0, limite);
}
