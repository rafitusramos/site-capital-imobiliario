import { z } from "zod";

export type StatusWa = "enviado" | "entregue" | "lido" | "falhou";

export type EventoWa =
  | {
      tipo: "mensagem";
      chave: string; // m:<id>
      waId: string;
      nomePerfil: string | null;
      metaId: string;
      conteudo: "texto" | "botao" | "outro";
      texto: string | null;
      em: string; // ISO
    }
  | {
      tipo: "status";
      chave: string; // s:<id>:<status>
      metaId: string;
      status: StatusWa;
      erro: { codigo: number; mensagem: string } | null;
    };

const idSchema = z.string().min(1);

const mensagemSchema = z.object({
  from: idSchema,
  id: idSchema,
  timestamp: z.union([z.string(), z.number()]),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  interactive: z
    .object({
      type: z.string().optional(),
      button_reply: z.object({ id: z.string().optional(), title: z.string() }).optional(),
    })
    .optional(),
  button: z.object({ payload: z.string().optional(), text: z.string() }).optional(),
});

const statusSchema = z.object({
  id: idSchema,
  status: z.string(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
});

const STATUS_META: Record<string, StatusWa> = {
  sent: "enviado",
  delivered: "entregue",
  read: "lido",
  failed: "falhou",
};

const ORDEM: Record<Exclude<StatusWa, "falhou">, number> = { enviado: 1, entregue: 2, lido: 3 };

/** O status novo deve gravar por cima do atual? Nunca regride (lido -> entregue); falhou sempre vale. */
export function statusAvanca(atual: StatusWa | null, novo: StatusWa): boolean {
  if (novo === "falhou" || atual === null) return true;
  if (atual === "falhou") return false;
  return ORDEM[novo] > ORDEM[atual];
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function emIso(timestamp: string | number): string {
  const segundos = Number(timestamp);
  const data = new Date(segundos * 1000);
  return Number.isFinite(segundos) && !Number.isNaN(data.getTime())
    ? data.toISOString()
    : new Date(0).toISOString();
}

function nomesPorWaId(contacts: unknown): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const item of lista(contacts)) {
    const c = objeto(item);
    if (!c || typeof c.wa_id !== "string") continue;
    const nome = objeto(c.profile)?.name;
    if (typeof nome === "string" && nome) mapa.set(c.wa_id, nome);
  }
  return mapa;
}

/** Transforma o JSON do webhook do WhatsApp em eventos tipados. Ignora o que não reconhece; nunca lança. */
export function lerEventosWa(corpo: unknown): EventoWa[] {
  const raiz = objeto(corpo);
  if (!raiz || raiz.object !== "whatsapp_business_account") return [];
  const eventos: EventoWa[] = [];

  for (const itemEntry of lista(raiz.entry)) {
    const entry = objeto(itemEntry);
    if (!entry) continue;

    for (const itemChange of lista(entry.changes)) {
      const change = objeto(itemChange);
      if (!change || change.field !== "messages") continue;
      const value = objeto(change.value);
      if (!value) continue;
      const nomes = nomesPorWaId(value.contacts);

      for (const itemMsg of lista(value.messages)) {
        const r = mensagemSchema.safeParse(itemMsg);
        if (!r.success) continue;
        const m = r.data;
        let conteudo: "texto" | "botao" | "outro" = "outro";
        let texto: string | null = null;
        if (m.type === "text" && m.text) {
          conteudo = "texto";
          texto = m.text.body;
        } else if (m.type === "interactive" && m.interactive?.button_reply) {
          conteudo = "botao";
          texto = m.interactive.button_reply.title;
        } else if (m.type === "button" && m.button) {
          conteudo = "botao";
          texto = m.button.text;
        }
        eventos.push({
          tipo: "mensagem",
          chave: `m:${m.id}`,
          waId: m.from,
          nomePerfil: nomes.get(m.from) ?? null,
          metaId: m.id,
          conteudo,
          texto,
          em: emIso(m.timestamp),
        });
      }

      for (const itemStatus of lista(value.statuses)) {
        const r = statusSchema.safeParse(itemStatus);
        if (!r.success) continue;
        const s = r.data;
        const status = STATUS_META[s.status];
        if (!status) continue;
        const erro = s.errors?.[0];
        eventos.push({
          tipo: "status",
          chave: `s:${s.id}:${s.status}`,
          metaId: s.id,
          status,
          erro: erro ? { codigo: erro.code, mensagem: erro.message ?? erro.title ?? "" } : null,
        });
      }
    }
  }
  return eventos;
}

const gravadoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("mensagem"),
    chave: z.string(),
    waId: z.string(),
    nomePerfil: z.string().nullable(),
    metaId: z.string(),
    conteudo: z.enum(["texto", "botao", "outro"]),
    texto: z.string().nullable(),
    em: z.string(),
  }),
  z.object({
    tipo: z.literal("status"),
    chave: z.string(),
    metaId: z.string(),
    status: z.enum(["enviado", "entregue", "lido", "falhou"]),
    erro: z.object({ codigo: z.number(), mensagem: z.string() }).nullable(),
  }),
]);

/** Volta o payload gravado em wa_eventos (o próprio EventoWa) ao tipo; null se a forma não confere. */
export function lerEventoGravadoWa(payload: unknown): EventoWa | null {
  const r = gravadoSchema.safeParse(payload);
  return r.success ? r.data : null;
}
