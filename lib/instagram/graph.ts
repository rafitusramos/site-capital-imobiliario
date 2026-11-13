import "server-only";
import { configMeta } from "./config";
import type { ErroGraph } from "./fila";
import { corpoMensagem } from "./mensagens";
import type { MensagemSaida } from "./tipos";

// ---------------------------------------------------------------------------
// Constantes da Graph API (Instagram API with Unified Login: token de usuário de
// sistema, sem Página do Facebook).
// Docs consultadas em 2026-11-13:
//  - Host: https://developers.facebook.com/docs/instagram-platform/private-replies
//    ("graph.facebook.com para Unified Login ou Facebook Login") e
//    .../webhooks (Unified Login = graph.facebook.com + Business Integration
//    System User token). CONFIRMADO.
//  - Versão v27.0: exemplos de
//    .../instagram-api-with-instagram-login/messaging-api. A página é do host
//    graph.instagram.com, mas a versão é a vigente na doc. CONFERIR para o host
//    graph.facebook.com.
//  - Send API (recipient.id / recipient.comment_id, message): CONFIRMADO.
//  - Botão do template: doc só detalha `generic` (postback/web_url CONFIRMADO).
//    Template `button` e seu uso em resposta privada: CONFERIR.
// ---------------------------------------------------------------------------
export const GRAPH_BASE = "https://graph.facebook.com";
export const GRAPH_VERSAO = "v27.0";
/** Diálogo OAuth do Facebook Login for Business (config_id). CONFERIR. */
export const LOGIN_DIALOGO_BASE = "https://www.facebook.com";
/** Campo "a pessoa segue a conta". CONFERIR (não consta nas páginas lidas). */
export const CAMPO_SEGUE = "is_user_follow_business";
export const CAMPOS_PERFIL = `name,username,profile_pic,${CAMPO_SEGUE}`;
export const CAMPOS_PUBLICACAO =
  "id,caption,media_type,thumbnail_url,media_url,permalink,timestamp";
export const CAMPOS_CONTA = "id,username,name,profile_picture_url";
/** Contas atribuídas ao usuário de sistema. CONFERIR. */
export const CAMINHO_CONTAS = "me/assigned_instagram_accounts";
export const CAMPOS_WEBHOOK = "comments,messages,messaging_postbacks";

export type ResultadoGraph = { ok: true; id?: string } | ({ ok: false } & ErroGraph);

export type Publicacao = {
  id: string;
  legenda: string | null;
  tipo: string;
  miniatura: string | null;
  permalink: string;
  criadaEm: string;
};

export interface GraphIg {
  respostaPrivada(comentarioId: string, m: MensagemSaida): Promise<ResultadoGraph>;
  mensagem(igsid: string, m: MensagemSaida): Promise<ResultadoGraph>;
  responderComentario(comentarioId: string, texto: string): Promise<ResultadoGraph>;
  segue(igsid: string): Promise<boolean | null>;
  midiaCriadaEm(midiaId: string): Promise<string | null>;
  publicacoes(limite: number): Promise<Publicacao[]>;
  perfil(
    igsid: string,
  ): Promise<{ username: string | null; nome: string | null; fotoUrl: string | null } | null>;
}

/** Nenhuma chamada à Graph pode prender a função (webhook, disparador, admin) por mais que isso. */
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

function texto(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

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
      console.error("[instagram] Graph recusou", metodo, r.status, e.codigo ?? "", e.mensagem);
      return { ok: false, ...e };
    }
    return { ok: true, corpo: json };
  } catch (e) {
    const mensagem = limpar(texto(e), token);
    console.error("[instagram] falha de rede na Graph", metodo, mensagem);
    return { ok: false, status: 0, mensagem };
  }
}

function paraResultado(c: Chamada): ResultadoGraph {
  if (!c.ok) return c;
  const id = c.corpo.message_id ?? c.corpo.id;
  return typeof id === "string" ? { ok: true, id } : { ok: true };
}

/** JSON válido que não é objeto (null, array, primitivo) vira {}. */
function objeto(v: unknown): Json {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Json) : {};
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function criarGraph(token: string, igUserId: string, f: typeof fetch = fetch): GraphIg {
  return {
    async respostaPrivada(comentarioId, m) {
      return paraResultado(
        await chamar(f, token, "POST", url(`${igUserId}/messages`), {
          recipient: { comment_id: comentarioId },
          message: corpoMensagem(m),
        }),
      );
    },
    async mensagem(igsid, m) {
      return paraResultado(
        await chamar(f, token, "POST", url(`${igUserId}/messages`), {
          recipient: { id: igsid },
          message: corpoMensagem(m),
        }),
      );
    },
    async responderComentario(comentarioId, t) {
      return paraResultado(
        await chamar(f, token, "POST", url(`${comentarioId}/replies`), { message: t }),
      );
    },
    async segue(igsid) {
      const c = await chamar(f, token, "GET", url(igsid, { fields: CAMPO_SEGUE }));
      if (!c.ok) return null;
      const v = c.corpo[CAMPO_SEGUE];
      return typeof v === "boolean" ? v : null;
    },
    async midiaCriadaEm(midiaId) {
      const c = await chamar(f, token, "GET", url(midiaId, { fields: "timestamp" }));
      return c.ok ? str(c.corpo.timestamp) : null;
    },
    async publicacoes(limite) {
      const c = await chamar(
        f,
        token,
        "GET",
        url(`${igUserId}/media`, { fields: CAMPOS_PUBLICACAO, limit: String(limite) }),
      );
      if (!c.ok || !Array.isArray(c.corpo.data)) return [];
      return (c.corpo.data as unknown[])
        .map(objeto)
        .filter((p) => str(p.id) !== null)
        .map((p) => ({
        id: p.id as string,
        legenda: str(p.caption),
        tipo: str(p.media_type) ?? "",
        miniatura: str(p.thumbnail_url) ?? str(p.media_url),
        permalink: str(p.permalink) ?? "",
        criadaEm: str(p.timestamp) ?? "",
        }));
    },
    async perfil(igsid) {
      const c = await chamar(f, token, "GET", url(igsid, { fields: CAMPOS_PERFIL }));
      if (!c.ok) return null;
      return {
        username: str(c.corpo.username),
        nome: str(c.corpo.name),
        fotoUrl: str(c.corpo.profile_pic),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Login (Facebook Login for Business com config_id) e inscrição de webhooks.
// Nunca lançam; sem configuração devolvem null/false.
// ---------------------------------------------------------------------------

export function urlDeLogin(state: string, redirectUri: string): string | null {
  const cfg = configMeta();
  if (!cfg) return null;
  const q = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: redirectUri,
    config_id: cfg.loginConfigId,
    state,
    response_type: "code",
    override_default_response_type: "true",
  });
  return `${LOGIN_DIALOGO_BASE}/${GRAPH_VERSAO}/dialog/oauth?${q.toString()}`;
}

/**
 * Troca o code pelo token. O segredo do app vai no corpo do POST (form), não na URL.
 * CONFERIR: a doc do Meta mostra GET com query; POST form é aceito pela Graph.
 */
export async function trocarCodigo(
  code: string,
  redirectUri: string,
): Promise<{ token: string } | null> {
  const cfg = configMeta();
  if (!cfg) return null;
  try {
    const r = await fetch(url("oauth/access_token"), {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.appId,
        client_secret: cfg.appSecret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });
    const json = objeto(await r.json());
    const t = str(json.access_token);
    if (!r.ok || !t) {
      console.error("[instagram] troca de código recusada", r.status);
      return null;
    }
    return { token: t };
  } catch (e) {
    console.error("[instagram] falha na troca de código", limpar(texto(e), cfg.appSecret));
    return null;
  }
}

export async function contaAtribuida(
  token: string,
): Promise<{ igUserId: string; username: string; nome: string; fotoUrl: string } | null> {
  const c = await chamar(fetch, token, "GET", url(CAMINHO_CONTAS, { fields: CAMPOS_CONTA }));
  if (!c.ok || !Array.isArray(c.corpo.data) || c.corpo.data.length === 0) return null;
  const p = objeto(c.corpo.data[0]);
  const id = str(p.id);
  if (!id) return null;
  return {
    igUserId: id,
    username: str(p.username) ?? "",
    nome: str(p.name) ?? "",
    fotoUrl: str(p.profile_picture_url) ?? "",
  };
}

export async function assinarWebhooks(token: string, igUserId: string): Promise<boolean> {
  const c = await chamar(
    fetch,
    token,
    "POST",
    url(`${igUserId}/subscribed_apps`, { subscribed_fields: CAMPOS_WEBHOOK }),
  );
  return c.ok;
}
