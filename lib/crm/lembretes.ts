/**
 * Atraso e rótulo relativo de lembretes — o ponto delicado do módulo
 * (docs/crm-spec.md §5, caso de borda 8). O banco guarda `agendado_para` em
 * `timestamptz` (um instante absoluto), mas "hoje", "amanhã" e "há N dias"
 * são conceitos de CALENDÁRIO, e calendário depende de fuso. Um lembrete às
 * 23h de São Paulo é 02h do dia seguinte em UTC — se o cálculo de dia usasse
 * o fuso do servidor (Vercel roda em UTC), "hoje 23:00" viraria "amanhã
 * 23:00" horas antes da meia-noite real em São Paulo. Por isso todo cálculo
 * de calendário aqui passa por `America/Sao_Paulo` via Intl, nunca por
 * `Date.getDate()`/`getHours()` (que leem o fuso do processo).
 */

const FUSO = "America/Sao_Paulo";

function paraData(valor: string | Date): Date {
  return valor instanceof Date ? valor : new Date(valor);
}

/**
 * Ano/mês/dia/hora/minuto de `data` como aparecem em São Paulo.
 * `hourCycle: "h23"` é explícito de propósito: sem isso, `hour12: false`
 * pode devolver "24" à meia-noite em vez de "00" (quirk conhecido do ICU),
 * o que faria "hoje 00:00" virar o texto errado "hoje 24:00".
 */
function partesSaoPaulo(data: Date) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return {
    ano: Number(obter("year")),
    mes: Number(obter("month")),
    dia: Number(obter("day")),
    hora: obter("hour"),
    minuto: obter("minute"),
  };
}

/** Dia como número inteiro de dias desde a época — só a data, sem hora, no fuso de SP. */
function diaEpocaSaoPaulo(data: Date): number {
  const { ano, mes, dia } = partesSaoPaulo(data);
  return Date.UTC(ano, mes - 1, dia) / 86_400_000;
}

/** "14:00" no fuso de São Paulo. */
function horaMinutoSaoPaulo(data: Date): string {
  const { hora, minuto } = partesSaoPaulo(data);
  return `${hora}:${minuto}`;
}

/**
 * Diferença em dias de CALENDÁRIO (em São Paulo) entre `referencia` e `alvo`.
 * Positivo quando `alvo` é depois de `referencia` (ex.: amanhã → 1).
 */
function diferencaDiasCalendario(referencia: Date, alvo: Date): number {
  return diaEpocaSaoPaulo(alvo) - diaEpocaSaoPaulo(referencia);
}

/**
 * Atrasado é comparação de INSTANTE, não de calendário: um lembrete às 23:59
 * já passou às 00:01 do mesmo dia em SP, independente de fuso — por isso
 * usa `getTime()` puro, ao contrário de `ehHoje`/`rotuloRelativo` abaixo.
 */
export function estaAtrasado(agendadoPara: string | Date, agora: string | Date = new Date()): boolean {
  return paraData(agendadoPara).getTime() < paraData(agora).getTime();
}

/** true quando `agendadoPara` cai no mesmo dia de calendário que `agora`, em São Paulo. */
export function ehHoje(agendadoPara: string | Date, agora: string | Date = new Date()): boolean {
  return diferencaDiasCalendario(paraData(agora), paraData(agendadoPara)) === 0;
}

/**
 * Rótulo relativo em pt-BR, sempre a partir do calendário de São Paulo:
 * "hoje 14:00", "amanhã 09:00", "ontem 18:30", "em 5 dias", "há 3 dias".
 */
export function rotuloRelativo(agendadoPara: string | Date, agora: string | Date = new Date()): string {
  const alvo = paraData(agendadoPara);
  const referencia = paraData(agora);
  const diffDias = diferencaDiasCalendario(referencia, alvo);
  const hora = horaMinutoSaoPaulo(alvo);

  if (diffDias === 0) return `hoje ${hora}`;
  if (diffDias === 1) return `amanhã ${hora}`;
  if (diffDias === -1) return `ontem ${hora}`;
  if (diffDias > 1) return `em ${diffDias} dias`;
  return `há ${Math.abs(diffDias)} dias`;
}
