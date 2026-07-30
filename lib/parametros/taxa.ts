/**
 * Conversão percentual ↔ decimal para as taxas dos simuladores.
 *
 * O formulário do admin (components/admin/ParametrosForm.tsx) trabalha com o
 * número que uma pessoa digita — "11,5" para financiamento, "1,09" para home
 * equity — porque é assim que a taxa aparece em qualquer contrato ou anúncio
 * de banco. O banco (parametros_simulador, ver migration 013) guarda o valor
 * em decimal — 0.115, 0.0109 — porque é o formato que lib/financeiro.ts
 * (taxaMensal, parcelaPrice, parcelaInicialSAC) espera receber.
 *
 * ESSA É A ARMADILHA CENTRAL DA FEATURE: gravar 11.5 em vez de 0.115 no banco
 * não quebra nada visivelmente — não há erro, não há exceção — mas faz a
 * parcela calculada pelos simuladores sair ~100x maior que a real. Por isso
 * a conversão vive num único lugar, testado, e é o único caminho usado pela
 * server action que salva os parâmetros (app/actions/admin-parametros.ts).
 */

/** "11,5" (digitado como 11.5) → 0.115, salvo no banco. */
export function percentualParaDecimal(valor: number): number {
  // Arredonda em 6 casas para não gravar lixo de ponto flutuante do tipo
  // 0.11499999999999999 (11.5 / 100 em ponto flutuante binário).
  return Math.round((valor / 100) * 1_000_000) / 1_000_000;
}

/** 0.115 (vindo do banco) → 11.5, exibido no formulário. */
export function decimalParaPercentual(valor: number): number {
  return Math.round(valor * 100 * 10_000) / 10_000;
}
