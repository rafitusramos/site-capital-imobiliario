/**
 * Porta das máscaras de input de dist/assets/js/modal-form.js (objeto
 * MASCARAS). Cada função recebe o valor bruto atual do input (o que o
 * usuário acabou de digitar, com ou sem máscara anterior) e devolve o
 * valor já formatado — mesmo comportamento do original: descarta a
 * formatação anterior e reconstrói a partir dos dígitos.
 */

export function mascaraMoeda(valorAtual: string): string {
  const d = valorAtual.replace(/\D/g, "").slice(0, 12);
  if (!d) return "";
  return "R$ " + Number(d).toLocaleString("pt-BR");
}

export function mascaraTelefone(valorAtual: string): string {
  const d = valorAtual.replace(/\D/g, "").slice(0, 11);
  let v = d;
  if (d.length > 2) v = "(" + d.slice(0, 2) + ") " + d.slice(2);
  if (d.length > 7) v = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  return v;
}

export function mascaraCpf(valorAtual: string): string {
  const d = valorAtual.replace(/\D/g, "").slice(0, 11);
  let v = d;
  if (d.length > 3) v = d.slice(0, 3) + "." + d.slice(3);
  if (d.length > 6) v = d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6);
  if (d.length > 9) v = d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
  return v;
}

export function mascaraCep(valorAtual: string): string {
  const d = valorAtual.replace(/\D/g, "").slice(0, 8);
  if (d.length > 5) return d.slice(0, 5) + "-" + d.slice(5);
  return d;
}

export function mascaraNum(valorAtual: string): string {
  return valorAtual.replace(/\D/g, "");
}

export function mascaraNumDec(valorAtual: string): string {
  return valorAtual.replace(/[^\d.,]/g, "");
}

export function mascaraUf(valorAtual: string): string {
  return valorAtual.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
}
