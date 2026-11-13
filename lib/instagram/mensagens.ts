// Montagem de mensagens do Instagram. A Task 5 acrescenta o resto deste arquivo.

/** Payload do botão de postback: "ig:<acao>:<participacaoId>". */
export function payloadBotao(acao: "b1" | "seguir", participacaoId: string): string {
  return `ig:${acao}:${participacaoId}`;
}
