import { ehTemporario, type ErroGraph } from "@/lib/instagram/fila";

// 131056: limite por par de números; 130429: limite de vazão; 131048: limite de spam; 131000: erro genérico.
const TEMPORARIOS_WA = new Set([131056, 130429, 131048, 131000]);

export function ehTemporarioWa(e: ErroGraph): boolean {
  return ehTemporario(e) || (e.codigo !== undefined && TEMPORARIOS_WA.has(e.codigo));
}

export function motivoLegivelWa(e: ErroGraph): string {
  const c = e.codigo;
  if (c === 131047) return "Janela de 24 h fechada";
  if (c === 131026) return "Número não recebe WhatsApp";
  if (c !== undefined && c >= 132000 && c <= 132999) return `Problema no template (código ${c})`;
  return `A Meta recusou o envio (código ${c ?? e.status})`;
}
