/**
 * Formatação pt-BR do documento de simulação (porta de brl/pct do
 * gerar_simulacao.py). Feita à mão, sem Intl: o resultado não pode depender
 * dos dados de locale do Node da Vercel.
 */

export function brl(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  const [inteiro, decimal] = Math.abs(valor).toFixed(casas).split(".");
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sinal = valor < 0 && Number(Math.abs(valor).toFixed(casas)) !== 0 ? "-" : "";
  return sinal + milhar + (decimal ? `,${decimal}` : "");
}

export function brl0(valor: number | null | undefined): string {
  return brl(valor, 0);
}

export function pct(valor: number): string {
  return `${valor.toFixed(2).replace(".", ",")}%`;
}
