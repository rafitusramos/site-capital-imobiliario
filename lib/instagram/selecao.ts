// Escolha da automação para um comentário. Módulo puro.
import { casaPalavras } from "./palavras";
import type { Automacao } from "./tipos";

interface Comentario {
  midiaId: string;
  texto: string;
  midiaCriadaEm: string | null;
}

function ms(iso: string | null): number {
  return iso ? Date.parse(iso) : NaN;
}

/**
 * Prioridade: (1) específica, ou "próxima" já vinculada, desta mídia;
 * (2) "próxima" sem vínculo cuja `proximaDesde` é anterior à criação da mídia
 * (vincular = true); (3) qualquer. Empate: criada por último.
 */
export function escolherAutomacao(
  lista: Automacao[],
  c: Comentario,
): { automacao: Automacao; vincular: boolean } | null {
  const criada = ms(c.midiaCriadaEm);
  let melhor: { automacao: Automacao; vincular: boolean; nivel: number } | null = null;

  for (const a of lista) {
    if (!a.ativa || !casaPalavras(c.texto, a.palavras)) continue;

    let nivel = 0;
    let vincular = false;
    if (a.alvo === "qualquer") {
      nivel = 3;
    } else if (a.midiaId) {
      if (a.midiaId === c.midiaId) nivel = 1;
    } else if (a.alvo === "proxima") {
      const desde = ms(a.proximaDesde);
      if (!Number.isNaN(criada) && !Number.isNaN(desde) && desde < criada) {
        nivel = 2;
        vincular = true;
      }
    }
    if (nivel === 0) continue;

    if (
      !melhor ||
      nivel < melhor.nivel ||
      (nivel === melhor.nivel && ms(a.criadoEm) > ms(melhor.automacao.criadoEm))
    ) {
      melhor = { automacao: a, vincular, nivel };
    }
  }
  return melhor ? { automacao: melhor.automacao, vincular: melhor.vincular } : null;
}
