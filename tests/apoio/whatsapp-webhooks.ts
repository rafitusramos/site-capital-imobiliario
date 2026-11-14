// Payloads de webhook do WhatsApp Cloud API no formato documentado pela Meta
// (object "whatsapp_business_account"; entry[].changes[] com field "messages").

export const WA_NUMERO_ID = "100000000000001";
export const WA_PESSOA = "5519999990000";

export function fixtureWa(
  value: { messages?: unknown[]; statuses?: unknown[]; contacts?: unknown[] },
) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "200000000000001",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "551934000000", phone_number_id: WA_NUMERO_ID },
              contacts: value.contacts ?? [{ profile: { name: "Maria Silva" }, wa_id: WA_PESSOA }],
              ...(value.messages ? { messages: value.messages } : {}),
              ...(value.statuses ? { statuses: value.statuses } : {}),
            },
          },
        ],
      },
    ],
  };
}

export function mensagemTexto(id = "wamid.X", body = "oi, quero saber mais") {
  return { from: WA_PESSOA, id, timestamp: "1760000000", type: "text", text: { body } };
}

export function fixtureTexto(id = "wamid.X", body = "oi, quero saber mais") {
  return fixtureWa({ messages: [mensagemTexto(id, body)] });
}

export function fixtureAudio() {
  return fixtureWa({
    messages: [
      { from: WA_PESSOA, id: "wamid.audio1", timestamp: "1760000001", type: "audio", audio: { id: "media1", mime_type: "audio/ogg" } },
    ],
  });
}

export function fixtureBotaoTemplate() {
  return fixtureWa({
    messages: [
      {
        from: WA_PESSOA,
        id: "wamid.botao1",
        timestamp: "1760000002",
        type: "button",
        button: { payload: "sim", text: "Quero atendimento" },
      },
    ],
  });
}

export function fixtureBotaoInterativo() {
  return fixtureWa({
    messages: [
      {
        from: WA_PESSOA,
        id: "wamid.botao2",
        timestamp: "1760000003",
        type: "interactive",
        interactive: { type: "button_reply", button_reply: { id: "b1", title: "Financiamento" } },
      },
    ],
  });
}

export function statusItem(status: string, extra: Record<string, unknown> = {}, id = "wamid.S1") {
  return { id, status, timestamp: "1760000010", recipient_id: WA_PESSOA, ...extra };
}

export function fixtureStatus(status: string, extra: Record<string, unknown> = {}, id = "wamid.S1") {
  return fixtureWa({ statuses: [statusItem(status, extra, id)] });
}
