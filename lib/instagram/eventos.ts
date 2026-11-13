import { z } from "zod";

export type EventoIg =
  | {
      tipo: "comentario";
      chave: string;
      comentarioId: string;
      midiaId: string;
      deId: string;
      deUsername: string | null;
      texto: string;
    }
  | { tipo: "botao"; chave: string; deId: string; payload: string; titulo: string }
  | {
      tipo: "texto";
      chave: string;
      deId: string;
      paraId: string;
      texto: string | null;
      eco: boolean;
      mid: string;
    };

const idSchema = z.string().min(1);

const comentarioSchema = z.object({
  id: idSchema,
  text: z.string().optional(),
  from: z.object({ id: idSchema, username: z.string().optional() }),
  media: z.object({ id: idSchema }),
});

const mensagemSchema = z.object({
  sender: z.object({ id: idSchema }),
  recipient: z.object({ id: idSchema }),
  message: z
    .object({
      mid: idSchema,
      text: z.string().nullish(),
      is_echo: z.boolean().optional(),
    })
    .optional(),
  postback: z
    .object({
      mid: idSchema,
      title: z.string().optional(),
      payload: z.string().optional(),
    })
    .optional(),
});

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

/** Transforma o JSON do webhook em eventos tipados. Ignora o que não reconhece; nunca lança. */
export function lerEventos(corpo: unknown): EventoIg[] {
  const raiz = objeto(corpo);
  if (!raiz || raiz.object !== "instagram") return [];
  const eventos: EventoIg[] = [];

  for (const itemEntry of lista(raiz.entry)) {
    const entry = objeto(itemEntry);
    if (!entry) continue;

    for (const itemChange of lista(entry.changes)) {
      const change = objeto(itemChange);
      if (!change || change.field !== "comments") continue;
      const r = comentarioSchema.safeParse(change.value);
      if (!r.success) continue;
      const c = r.data;
      eventos.push({
        tipo: "comentario",
        chave: c.id,
        comentarioId: c.id,
        midiaId: c.media.id,
        deId: c.from.id,
        deUsername: c.from.username ?? null,
        texto: c.text ?? "",
      });
    }

    for (const itemMsg of lista(entry.messaging)) {
      const r = mensagemSchema.safeParse(itemMsg);
      if (!r.success) continue;
      const m = r.data;
      if (m.postback) {
        eventos.push({
          tipo: "botao",
          chave: m.postback.mid,
          deId: m.sender.id,
          payload: m.postback.payload ?? "",
          titulo: m.postback.title ?? "",
        });
      } else if (m.message) {
        eventos.push({
          tipo: "texto",
          chave: m.message.mid,
          deId: m.sender.id,
          paraId: m.recipient.id,
          texto: m.message.text ?? null,
          eco: m.message.is_echo === true,
          mid: m.message.mid,
        });
      }
    }
  }
  return eventos;
}
