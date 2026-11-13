// Payloads de webhook do Instagram no formato documentado pela Meta
// (object "instagram"; comentários em entry[].changes[], mensagens em entry[].messaging[]).

export const IG_CONTA = "17841400000000001";
export const IG_PESSOA = "17841400000000002";

export function fixtureComentario(extra: Record<string, unknown> = {}) {
  return {
    object: "instagram",
    entry: [
      {
        id: IG_CONTA,
        time: 1760000000,
        changes: [
          {
            field: "comments",
            value: {
              id: "18000000000000001",
              text: "quero saber mais",
              from: { id: IG_PESSOA, username: "maria.silva" },
              media: { id: "17900000000000001", media_product_type: "FEED" },
              ...extra,
            },
          },
        ],
      },
    ],
  };
}

export function fixtureMensagem(
  mensagem: Record<string, unknown> = { mid: "mid.texto1", text: "oi" },
  sender = IG_PESSOA,
  recipient = IG_CONTA,
) {
  return {
    object: "instagram",
    entry: [
      {
        id: IG_CONTA,
        time: 1760000000,
        messaging: [{ sender: { id: sender }, recipient: { id: recipient }, timestamp: 1760000000000, message: mensagem }],
      },
    ],
  };
}

export function fixtureEco() {
  return fixtureMensagem({ mid: "mid.eco1", text: "resposta enviada", is_echo: true }, IG_CONTA, IG_PESSOA);
}

export function fixturePostback() {
  return {
    object: "instagram",
    entry: [
      {
        id: IG_CONTA,
        time: 1760000000,
        messaging: [
          {
            sender: { id: IG_PESSOA },
            recipient: { id: IG_CONTA },
            timestamp: 1760000000000,
            postback: { mid: "mid.botao1", title: "Quero o link", payload: "ig:abc123" },
          },
        ],
      },
    ],
  };
}

export function fixtureLeitura() {
  return {
    object: "instagram",
    entry: [
      {
        id: IG_CONTA,
        time: 1760000000,
        messaging: [
          { sender: { id: IG_PESSOA }, recipient: { id: IG_CONTA }, timestamp: 1760000000000, read: { mid: "mid.x" } },
          {
            sender: { id: IG_PESSOA },
            recipient: { id: IG_CONTA },
            timestamp: 1760000000000,
            reaction: { mid: "mid.y", action: "react", reaction: "love" },
          },
        ],
      },
    ],
  };
}
