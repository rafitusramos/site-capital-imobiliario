/**
 * Máscara do destino de um envio para exibição no admin: nunca mostra o número
 * inteiro do cliente. Móvel/fixo brasileiro: `+55 19 9••••-1234`. Módulo puro.
 */
export function mascararWaId(waId: string): string {
  const d = String(waId ?? "").replace(/\D/g, "");
  if (!d) return "—";
  const m = /^55(\d{2})(\d{8,9})$/.exec(d);
  if (m) {
    const [, ddd, numero] = m;
    return `+55 ${ddd} ${numero[0]}••••-${numero.slice(-4)}`;
  }
  return `••••-${d.slice(-4)}`;
}
