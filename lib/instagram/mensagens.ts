// Montagem de mensagens do Instagram (puro, sem rede).
import type { MensagemSaida } from "./tipos";

/** Payload do botão de postback: "ig:<acao>:<participacaoId>". */
export function payloadBotao(acao: "b1" | "seguir", participacaoId: string): string {
  return `ig:${acao}:${participacaoId}`;
}

const PAYLOAD_RE = /^ig:(b1|seguir):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Lê o payload de um postback; null se não for nosso (ex.: payload de outra ferramenta). */
export function lerPayload(
  payload: string,
): { acao: "b1" | "seguir"; participacaoId: string } | null {
  const m = PAYLOAD_RE.exec(payload);
  if (!m) return null;
  return { acao: m[1] as "b1" | "seguir", participacaoId: m[2] };
}

/**
 * Objeto `message` da Send API (template de botão). O chamador acrescenta `recipient`.
 * Formato: attachment.type "template", template_type "button", botões "postback" ou "web_url".
 */
export function corpoMensagem(m: MensagemSaida): object {
  const b = m.botao;
  const botao =
    b.tipo === "postback"
      ? { type: "postback", title: b.titulo, payload: b.payload }
      : { type: "web_url", url: b.url, title: b.titulo };
  return {
    attachment: {
      type: "template",
      payload: { template_type: "button", text: m.texto, buttons: [botao] },
    },
  };
}
