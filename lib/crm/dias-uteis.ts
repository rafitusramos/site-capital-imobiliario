/**
 * Dias úteis (segunda a sexta, SEM calendário de feriados) no fuso de São
 * Paulo — a régua do SLA do CRM desde a migration 029. É a MESMA régua de
 * `public.somar_dias_uteis` (029): parte da DATA de São Paulo do início e
 * conta só os dias estritamente DEPOIS dela. Quem muda uma muda a outra.
 *
 * Calendário depende de fuso: 23h em SP já é o dia seguinte em UTC, e o
 * servidor da Vercel roda em UTC — por isso a data sai de `Intl` com
 * `timeZone`, nunca de `getDate()`.
 */

const FUSO = "America/Sao_Paulo";

/** Dia civil de SP como "dias desde a época" (só a data, sem hora). */
function diaEpocaSaoPaulo(data: Date): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const obter = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return Date.UTC(obter("year"), obter("month") - 1, obter("day")) / 86_400_000;
}

/** Dia da semana (0 = domingo) de um "dia desde a época". */
function diaDaSemana(diaEpoca: number): number {
  return new Date(diaEpoca * 86_400_000).getUTCDay();
}

/**
 * Dias úteis estritamente depois da data de `inicio` até a data de `fim`,
 * inclusive, em SP. Mesmo dia (ou fim antes do início) vale 0; o início em
 * fim de semana não conta, mas a segunda seguinte conta.
 */
export function diasUteisEntre(inicio: string | Date, fim: string | Date): number {
  const de = diaEpocaSaoPaulo(inicio instanceof Date ? inicio : new Date(inicio));
  const ate = diaEpocaSaoPaulo(fim instanceof Date ? fim : new Date(fim));
  let total = 0;
  for (let dia = de + 1; dia <= ate; dia++) {
    const semana = diaDaSemana(dia);
    if (semana !== 0 && semana !== 6) total++;
  }
  return total;
}
