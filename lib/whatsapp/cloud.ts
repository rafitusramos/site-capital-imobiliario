import "server-only";
import { GRAPH_BASE, GRAPH_VERSAO } from "@/lib/instagram/graph";
import type { ErroGraph } from "@/lib/instagram/fila";

export type ResultadoCloud = { ok: true; metaId: string } | ({ ok: false } & ErroGraph);

export interface CloudWa {
  enviar(waId: string, corpo: Record<string, unknown>): Promise<ResultadoCloud>;
  texto(waId: string, texto: string): Promise<ResultadoCloud>;
  infoDoNumero(): Promise<{ numero: string; nomeExibicao: string; qualidade: string } | null>;
  assinarWebhooks(wabaId: string): Promise<boolean>;
}

/** Nenhuma chamada à Cloud API pode prender a função por mais que isso. */
const TIMEOUT_MS = 15_000;

type Json = Record<string, unknown>;
type Chamada = { ok: true; corpo: Json } | ({ ok: false } & ErroGraph);

function url(caminho: string, params?: Record<string, string>): string {
  const q = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `${GRAPH_BASE}/${GRAPH_VERSAO}/${caminho}${q}`;
}

/** Remove o token de qualquer texto que vá para log ou resultado. */
function limpar(texto: string, token: string): string {
  return token ? texto.split(token).join("[token]") : texto;
}

function objeto(v: unknown): Json {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Json) : {};
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

async function chamar(
  f: typeof fetch,
  token: string,
  metodo: "GET" | "POST",
  endereco: string,
  corpo?: object,
): Promise<Chamada> {
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const init: RequestInit = { method: metodo, headers, signal: AbortSignal.timeout(TIMEOUT_MS) };
    if (corpo) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(corpo);
    }
    const r = await f(endereco, init);
    let json: Json = {};
    try {
      json = objeto(await r.json());
    } catch {
      // corpo vazio ou não JSON: segue só com o status
    }
    if (!r.ok) {
      const err = objeto(json.error) as {
        code?: number;
        error_subcode?: number;
        message?: string;
      };
      const e: ErroGraph = {
        status: r.status,
        mensagem: limpar(err.message ?? `HTTP ${r.status}`, token),
      };
      if (typeof err.code === "number") e.codigo = err.code;
      if (typeof err.error_subcode === "number") e.subcodigo = err.error_subcode;
      console.error("[whatsapp] Cloud API recusou", metodo, r.status, e.codigo ?? "", e.mensagem);
      return { ok: false, ...e };
    }
    return { ok: true, corpo: json };
  } catch (e) {
    const mensagem = limpar(e instanceof Error ? e.message : String(e), token);
    console.error("[whatsapp] falha de rede na Cloud API", metodo, mensagem);
    return { ok: false, status: 0, mensagem };
  }
}

export function criarCloud(
  token: string,
  phoneNumberId: string,
  f: typeof fetch = fetch,
): CloudWa {
  async function enviar(waId: string, corpo: Record<string, unknown>): Promise<ResultadoCloud> {
    const c = await chamar(f, token, "POST", url(`${phoneNumberId}/messages`), {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: waId,
      ...corpo,
    });
    if (!c.ok) return c;
    const msgs = Array.isArray(c.corpo.messages) ? c.corpo.messages : [];
    const id = str(objeto(msgs[0]).id);
    if (!id) {
      console.error("[whatsapp] resposta sem id de mensagem");
      return { ok: false, status: 200, mensagem: "resposta sem id de mensagem" };
    }
    return { ok: true, metaId: id };
  }

  return {
    enviar,
    texto: (waId, texto) =>
      enviar(waId, { type: "text", text: { body: texto, preview_url: true } }),
    async infoDoNumero() {
      const c = await chamar(
        f,
        token,
        "GET",
        url(phoneNumberId, { fields: "display_phone_number,verified_name,quality_rating" }),
      );
      if (!c.ok) return null;
      return {
        numero: str(c.corpo.display_phone_number) ?? "",
        nomeExibicao: str(c.corpo.verified_name) ?? "",
        qualidade: str(c.corpo.quality_rating) ?? "",
      };
    },
    async assinarWebhooks(wabaId) {
      const c = await chamar(f, token, "POST", url(`${wabaId}/subscribed_apps`));
      return c.ok;
    },
  };
}
