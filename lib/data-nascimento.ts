/**
 * Data de nascimento do lead: a idade entra no cálculo do seguro MIP, que
 * muda a parcela. Funções puras (sem Date local do servidor/navegador): o
 * "hoje" é sempre o de America/Sao_Paulo, senão perto da meia-noite o servidor
 * (UTC) e o navegador discordariam sobre a idade.
 */

export const IDADE_MINIMA = 18;
export const IDADE_MAXIMA = 100;

export interface DiaCivil {
  ano: number;
  mes: number;
  dia: number;
}

/** Data de hoje (ano, mês 1-12, dia) no fuso de São Paulo. */
export function hojeEmSaoPaulo(agora: Date = new Date()): DiaCivil {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const pega = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { ano: pega("year"), mes: pega("month"), dia: pega("day") };
}

function diaExiste(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function lerIso(iso: string): DiaCivil | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return diaExiste(ano, mes, dia) ? { ano, mes, dia } : null;
}

/** "dd/mm/aaaa" -> "aaaa-mm-dd"; null se incompleta ou se o dia não existe. */
export function dataBrParaIso(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto ?? "").trim());
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!diaExiste(ano, mes, dia)) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** "aaaa-mm-dd" -> "dd/mm/aaaa" por texto, sem Date (nada de fuso). Inválido vira "". */
export function formatarDataNascimento(iso: string | null | undefined): string {
  const d = iso ? lerIso(iso) : null;
  if (!d) return "";
  return `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`;
}

/** Idade completa em anos na data de hoje (São Paulo). */
export function idadeEmAnos(iso: string, agora: Date = new Date()): number {
  const nasc = lerIso(iso);
  if (!nasc) return NaN;
  const h = hojeEmSaoPaulo(agora);
  let idade = h.ano - nasc.ano;
  if (h.mes < nasc.mes || (h.mes === nasc.mes && h.dia < nasc.dia)) idade -= 1;
  return idade;
}

/** ISO real, não futura, com idade entre 18 e 100 anos. */
export function isoDataNascimentoValida(iso: string, agora: Date = new Date()): boolean {
  if (!lerIso(iso)) return false;
  const idade = idadeEmAnos(iso, agora);
  return idade >= IDADE_MINIMA && idade <= IDADE_MAXIMA;
}

/** Mesma regra, para o texto mascarado "dd/mm/aaaa" do formulário. */
export function dataNascimentoValida(texto: string, agora: Date = new Date()): boolean {
  const iso = dataBrParaIso(texto);
  return iso !== null && isoDataNascimentoValida(iso, agora);
}

/** ISO real e não futura, sem faixa de idade: para a edição manual no CRM. */
export function isoDataNaoFutura(iso: string, agora: Date = new Date()): boolean {
  const d = lerIso(iso);
  if (!d) return false;
  const h = hojeEmSaoPaulo(agora);
  return compara(d, h) <= 0;
}

function compara(a: DiaCivil, b: DiaCivil): number {
  return a.ano - b.ano || a.mes - b.mes || a.dia - b.dia;
}
