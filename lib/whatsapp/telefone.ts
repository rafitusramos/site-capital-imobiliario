/**
 * Telefone <-> wa_id (WhatsApp). Módulo puro.
 *
 * O telefone do lead vem do formulário em formato livre (a validação do site
 * guarda só dígitos, 10 ou 11, sem o 55). O `wa_id` da Meta é o número
 * internacional só com dígitos. Para números brasileiros móveis, o `wa_id` que
 * chega no webhook pode vir sem o 9º dígito.
 */

const DIGITOS_NACIONAIS = [10, 11];

/** `55` + DDD (2) + 8 ou 9 dígitos, ou `null` se não for um telefone brasileiro válido. */
export function waIdDoTelefone(telefone: string): string | null {
  const digitos = String(telefone ?? "").replace(/\D/g, "");
  let nacional: string;
  if (DIGITOS_NACIONAIS.includes(digitos.length)) {
    nacional = digitos;
  } else if (
    digitos.startsWith("55") &&
    DIGITOS_NACIONAIS.includes(digitos.length - 2)
  ) {
    nacional = digitos.slice(2);
  } else {
    return null;
  }
  const ddd = parseInt(nacional.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return null;
  return `55${nacional}`;
}

/**
 * Formas equivalentes de um `wa_id`: com e sem o 9º dígito (móvel brasileiro).
 * O original vem sempre primeiro. Fixo e número estrangeiro devolvem só o próprio.
 */
export function variantesDoWaId(waId: string): string[] {
  const m = /^55(\d{2})(\d{8,9})$/.exec(waId);
  if (!m) return [waId];
  const [, ddd, numero] = m;
  if (numero.length === 9 && numero[0] === "9") {
    return [waId, `55${ddd}${numero.slice(1)}`];
  }
  if (numero.length === 8 && "6789".includes(numero[0])) {
    return [waId, `55${ddd}9${numero}`];
  }
  return [waId];
}
