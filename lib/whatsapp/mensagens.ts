import { waIdDoTelefone } from "./telefone";

export function linkDoNumeroOficial(numero: string): string | null {
  const wa = waIdDoTelefone(numero);
  return wa ? `https://wa.me/${wa}` : null;
}

const INICIO = "Oi! Este número envia só avisos automáticos do seu atendimento.";

export function respostaFixa(linkOficial: string | null): string {
  if (linkOficial) return `${INICIO} Para falar com o Rafael Teixeira, chame aqui: ${linkOficial}`;
  return `${INICIO} Para falar com o Rafael Teixeira, responda ao nosso e-mail ou aguarde o contato dele.`;
}
