/**
 * Porta fiel de dist/assets/js/financeiro.js — mesmos algoritmos, mesmos
 * números de referência já verificados em tests/financeiro.test.js.
 * Funções puras, sem I/O — usadas pelo simulador (client) e pela
 * validação de CPF em lib/validations/lead.ts (server).
 */

export function digitos(valor: unknown): number {
  return Number(String(valor == null ? "" : valor).replace(/\D/g, "")) || 0;
}

// Números com separador decimal brasileiro (vírgula) ou ponto — usado em
// campos como área (m²), que aceitam casas decimais (mascaraNumDec), ao
// contrário dos campos monetários (que usam digitos()).
export function parseDecimalBr(valor: unknown): number {
  const normalizado = String(valor == null ? "" : valor).replace(",", ".").trim();
  const numero = parseFloat(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function taxaMensal(taxaAnual: number): number {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

// Tabela Price: parcela fixa = PV * i / (1 - (1+i)^-n)
export function parcelaPrice(pv: number, i: number, n: number): number {
  if (n <= 0 || pv <= 0) return 0;
  if (i <= 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

// SAC: parcela inicial = amortização constante + juros sobre o saldo total
export function parcelaInicialSAC(pv: number, i: number, n: number): number {
  if (n <= 0 || pv <= 0) return 0;
  return pv / n + pv * i;
}

// Telefone brasileiro: 10 (fixo) ou 11 (celular) dígitos, DDD 11-99, e se
// celular (11 dígitos) o 3º dígito (1º do número) precisa ser 9.
export function telefoneValido(telefoneBruto: string): boolean {
  const digitosTel = String(telefoneBruto || "").replace(/\D/g, "");
  if (digitosTel.length < 10 || digitosTel.length > 11) return false;
  const ddd = parseInt(digitosTel.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (digitosTel.length === 11 && digitosTel[2] !== "9") return false;
  return true;
}

// Validação de CPF pelos dígitos verificadores.
export function cpfValido(cpfBruto: string): boolean {
  const cpf = String(cpfBruto || "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf[10], 10);
}
