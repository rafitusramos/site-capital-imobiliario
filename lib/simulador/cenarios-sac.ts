/**
 * Cenário SAC puro (sem TR, seguros ou tarifas) usado para conferir a tabela
 * estática de /financiamento/. Taxa mensal equivalente: (1 + a)^(1/12) - 1.
 */
export function cenarioSac(
  principal: number,
  meses: number,
  taxaAnual: number,
): { primeiraParcela: number; totalPago: number } {
  const i = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  return {
    primeiraParcela: principal / meses + i * principal,
    totalPago: principal + (i * principal * (meses + 1)) / 2,
  };
}
