// Política de reenvio e texto de motivo das falhas da Graph API (puro).

export type ErroGraph = { status: number; codigo?: number; subcodigo?: number; mensagem: string };

const CODIGOS_TEMPORARIOS = new Set([1, 2, 4, 17, 32, 613]);

export function ehTemporario(e: ErroGraph): boolean {
  if (e.status === 0 || e.status === 429 || e.status >= 500) return true;
  return e.codigo !== undefined && CODIGOS_TEMPORARIOS.has(e.codigo);
}

/** agora + 2^tentativas minutos enquanto tentativas < 3; depois null (desiste). */
export function proximaTentativa(tentativas: number, agora: Date): Date | null {
  if (tentativas >= 3) return null;
  return new Date(agora.getTime() + 2 ** tentativas * 60_000);
}

export function motivoLegivel(e: ErroGraph): string {
  if (
    e.codigo === 10 ||
    e.subcodigo === 2018278 ||
    e.mensagem.toLowerCase().includes("outside of allowed window")
  ) {
    return "Janela de 24 h fechada";
  }
  if (e.codigo === 551) return "A pessoa não aceita mensagens";
  return `A Meta recusou o envio (código ${e.codigo ?? e.status})`;
}
