import { dataBrParaIso, formatarDataNascimento, hojeEmSaoPaulo } from "@/lib/data-nascimento";

/**
 * Data de revisão e de modificação do artigo.
 *
 * `posts.updated_at` muda com QUALQUER salvamento no admin (trocar categoria,
 * republicar, corrigir vírgula). Usá-lo como "atualizado em" ou como
 * `dateModified` declara uma revisão de conteúdo que não aconteceu, e o Google
 * trata data de atualização enganosa como sinal negativo — em tema YMYL
 * (crédito) pior ainda. Por isso a data de revisão é uma coluna à parte,
 * `posts.revisado_em` (migration 034), preenchida à mão só quando o conteúdo
 * foi de fato revisado.
 *
 * Funções puras. `revisado_em` chega como `aaaa-mm-dd` (coluna `date`) e é
 * tratado por texto: `new Date("2026-11-10")` é meia-noite UTC, ou seja, dia 9
 * em São Paulo. Trata-se `undefined` como `null`: o deploy da branch roda antes
 * de a migration existir e lê a coluna como ausente.
 */

export interface PostParaRevisao {
  published_at: string | null;
  updated_at: string;
  revisado_em?: string | null;
}

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Dia `aaaa-mm-dd` (São Paulo) de um instante; null se vazio ou inválido. */
export function diaDePublicacao(instante: string | null | undefined): string | null {
  if (!instante) return null;
  const data = new Date(instante);
  if (Number.isNaN(data.getTime())) return null;
  const { ano, mes, dia } = hojeEmSaoPaulo(data);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * A data de revisão só faz sentido se for posterior ao dia da publicação
 * (mesmo dia = ainda é a publicação). Vazia/inválida = coerente.
 */
function revisaoValida(revisado: string | null | undefined, publicadoEm: string | null): revisado is string {
  if (!revisado || !ISO_DIA.test(revisado)) return false;
  const dia = diaDePublicacao(publicadoEm);
  return dia === null || revisado > dia;
}

/** Para o "Revisado em" da página: a data ISO, ou null quando não deve aparecer. */
export function dataDeRevisaoVisivel(post: PostParaRevisao): string | null {
  return revisaoValida(post.revisado_em, post.published_at) ? post.revisado_em! : null;
}

/**
 * Para `dateModified` do JSON-LD e `lastModified` do sitemap: revisão real,
 * senão publicação, senão `updated_at` (rascunho não vai ao sitemap, mas a
 * função não devolve vazio).
 */
export function dataDeModificacao(post: PostParaRevisao): string {
  return dataDeRevisaoVisivel(post) ?? post.published_at ?? post.updated_at;
}

/** `aaaa-mm-dd` -> `dd-mm-aaaa` (mesmo formato da data de publicação), sem Date. */
export function formatarDataRevisao(iso: string): string {
  return formatarDataNascimento(iso).replaceAll("/", "-");
}

/**
 * Validação de gravação: revisão não pode ser anterior ao DIA de publicação
 * (mesmo dia vale; a constraint da migration 034 usa a mesma regra).
 */
export function revisaoCoerente(revisado: string | null, publicadoEm: string | null): boolean {
  if (!revisado) return true;
  const dia = diaDePublicacao(publicadoEm);
  return dia === null || revisado >= dia;
}

/** Texto `dd/mm/aaaa` do editor -> ISO; vazio -> null; inválido -> undefined. */
export function revisaoDoEditor(texto: string): string | null | undefined {
  const t = texto.trim();
  if (!t) return null;
  return dataBrParaIso(t) ?? undefined;
}
