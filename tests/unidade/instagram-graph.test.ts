import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GRAPH_BASE,
  GRAPH_VERSAO,
  assinarWebhooks,
  contaAtribuida,
  criarGraph,
  trocarCodigo,
  urlDeLogin,
} from "@/lib/instagram/graph";
import { configMeta } from "@/lib/instagram/config";
import { corpoMensagem } from "@/lib/instagram/mensagens";
import type { MensagemSaida } from "@/lib/instagram/tipos";

const TOKEN = "TOKEN-SECRETO-123";
const IG = "1784000000";
const msg: MensagemSaida = {
  texto: "Oi",
  botao: { tipo: "postback", titulo: "Quero", payload: "ig:b1:x" },
};

function resp(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status });
}

function fakeFetch(r: Response | Error) {
  return vi.fn(async () => {
    if (r instanceof Error) throw r;
    return r;
  });
}

let erros: unknown[][] = [];
beforeEach(() => {
  erros = [];
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
    erros.push(a);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("graph: mensagem", () => {
  it("faz POST em /<ig>/messages com corpoMensagem e Bearer", async () => {
    const f = fakeFetch(resp(200, { recipient_id: "9", message_id: "mid.1" }));
    const g = criarGraph(TOKEN, IG, f as unknown as typeof fetch);
    const r = await g.mensagem("555", msg);
    expect(r).toEqual({ ok: true, id: "mid.1" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${GRAPH_BASE}/${GRAPH_VERSAO}/${IG}/messages`);
    expect(url).not.toContain(TOKEN);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(init.body as string)).toEqual({
      recipient: { id: "555" },
      message: corpoMensagem(msg),
    });
  });

  it("erro do Graph vira ok:false com status e código", async () => {
    const f = fakeFetch(
      resp(400, { error: { code: 10, error_subcode: 2018278, message: "fora da janela" } }),
    );
    const r = await criarGraph(TOKEN, IG, f as unknown as typeof fetch).mensagem("555", msg);
    expect(r).toEqual({
      ok: false,
      status: 400,
      codigo: 10,
      subcodigo: 2018278,
      mensagem: "fora da janela",
    });
  });

  it("fetch rejeitando vira status 0, sem lançar e sem token no log", async () => {
    const f = fakeFetch(new Error(`falha com ${TOKEN}`));
    const r = await criarGraph(TOKEN, IG, f as unknown as typeof fetch).mensagem("555", msg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(0);
    expect(erros.length).toBeGreaterThan(0);
    expect(JSON.stringify(erros)).not.toContain(TOKEN);
  });

  it("resposta de erro HTTP não vaza o token no log", async () => {
    const f = fakeFetch(resp(500, { error: { code: 1, message: `erro ${TOKEN}` } }));
    await criarGraph(TOKEN, IG, f as unknown as typeof fetch).mensagem("555", msg);
    expect(JSON.stringify(erros)).not.toContain(TOKEN);
  });
});

describe("graph: demais chamadas", () => {
  it("respostaPrivada usa recipient.comment_id", async () => {
    const f = fakeFetch(resp(200, { message_id: "m2" }));
    const r = await criarGraph(TOKEN, IG, f as unknown as typeof fetch).respostaPrivada("c1", msg);
    expect(r).toEqual({ ok: true, id: "m2" });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).recipient).toEqual({ comment_id: "c1" });
  });

  it("responderComentario faz POST em /<comentario>/replies", async () => {
    const f = fakeFetch(resp(200, { id: "r1" }));
    const r = await criarGraph(TOKEN, IG, f as unknown as typeof fetch).responderComentario("c1", "ok");
    expect(r).toEqual({ ok: true, id: "r1" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${GRAPH_BASE}/${GRAPH_VERSAO}/c1/replies`);
    expect(JSON.parse(init.body as string)).toEqual({ message: "ok" });
  });

  it("segue lê is_user_follow_business e devolve null em erro", async () => {
    const g1 = criarGraph(TOKEN, IG, fakeFetch(resp(200, { is_user_follow_business: true })) as unknown as typeof fetch);
    expect(await g1.segue("555")).toBe(true);
    const g2 = criarGraph(TOKEN, IG, fakeFetch(resp(200, { is_user_follow_business: false })) as unknown as typeof fetch);
    expect(await g2.segue("555")).toBe(false);
    const g3 = criarGraph(TOKEN, IG, fakeFetch(resp(400, { error: { code: 100, message: "x" } })) as unknown as typeof fetch);
    expect(await g3.segue("555")).toBeNull();
    const g4 = criarGraph(TOKEN, IG, fakeFetch(new Error("rede")) as unknown as typeof fetch);
    expect(await g4.segue("555")).toBeNull();
    expect(JSON.stringify(erros)).not.toContain(TOKEN);
  });

  it("perfil e midiaCriadaEm", async () => {
    const f1 = fakeFetch(resp(200, { username: "u", name: "N", profile_pic: "http://p" }));
    expect(await criarGraph(TOKEN, IG, f1 as unknown as typeof fetch).perfil("555")).toEqual({
      username: "u",
      nome: "N",
      fotoUrl: "http://p",
    });
    const f2 = fakeFetch(resp(200, { timestamp: "2026-01-01T00:00:00+0000" }));
    expect(await criarGraph(TOKEN, IG, f2 as unknown as typeof fetch).midiaCriadaEm("m1")).toBe(
      "2026-01-01T00:00:00+0000",
    );
    const f3 = fakeFetch(resp(404, { error: { message: "x" } }));
    expect(await criarGraph(TOKEN, IG, f3 as unknown as typeof fetch).midiaCriadaEm("m1")).toBeNull();
    expect(await criarGraph(TOKEN, IG, f3 as unknown as typeof fetch).perfil("1")).toBeNull();
  });

  it("publicacoes mapeia a lista", async () => {
    const f = fakeFetch(
      resp(200, {
        data: [
          {
            id: "1",
            caption: "legenda",
            media_type: "IMAGE",
            media_url: "http://img",
            permalink: "http://p",
            timestamp: "t",
          },
          {
            id: "2",
            media_type: "VIDEO",
            thumbnail_url: "http://th",
            media_url: "http://v",
            permalink: "http://p2",
            timestamp: "t2",
          },
        ],
      }),
    );
    const r = await criarGraph(TOKEN, IG, f as unknown as typeof fetch).publicacoes(5);
    expect(r).toEqual([
      { id: "1", legenda: "legenda", tipo: "IMAGE", miniatura: "http://img", permalink: "http://p", criadaEm: "t" },
      { id: "2", legenda: null, tipo: "VIDEO", miniatura: "http://th", permalink: "http://p2", criadaEm: "t2" },
    ]);
    const [url] = f.mock.calls[0] as unknown as [string];
    expect(url).toContain(`/${IG}/media?`);
    expect(url).toContain("limit=5");
    expect(url).not.toContain(TOKEN);
  });
});

describe("graph: corpos JSON que não são objeto", () => {
  const mk = (r: Response) => criarGraph(TOKEN, IG, fakeFetch(r) as unknown as typeof fetch);

  it("200 com corpo null/array/primitivo não lança", async () => {
    for (const corpo of [null, [], 5, "x"]) {
      expect(await mk(resp(200, corpo)).mensagem("1", msg)).toEqual({ ok: true });
      expect(await mk(resp(200, corpo)).segue("1")).toBeNull();
      expect(await mk(resp(200, corpo)).midiaCriadaEm("1")).toBeNull();
      expect(await mk(resp(200, corpo)).perfil("1")).toEqual({
        username: null,
        nome: null,
        fotoUrl: null,
      });
      expect(await mk(resp(200, corpo)).publicacoes(3)).toEqual([]);
    }
  });

  it("500 com corpo null mantém o status 500", async () => {
    const r = await mk(resp(500, null)).mensagem("1", msg);
    expect(r).toMatchObject({ ok: false, status: 500 });
  });

  it("data com null e itens sem id: filtra", async () => {
    const r = await mk(
      resp(200, { data: [null, 3, { caption: "sem id" }, { id: "7", permalink: "p" }] }),
    ).publicacoes(5);
    expect(r.map((p) => p.id)).toEqual(["7"]);
  });

  it("contaAtribuida com data [null] devolve null", async () => {
    vi.stubGlobal("fetch", fakeFetch(resp(200, { data: [null] })));
    expect(await contaAtribuida(TOKEN)).toBeNull();
  });
});

describe("config e login", () => {
  const VARS = ["META_APP_ID", "META_APP_SECRET", "META_LOGIN_CONFIG_ID", "META_WEBHOOK_VERIFY_TOKEN", "CRON_SECRET"];

  it("configMeta lê no momento da chamada e é null se faltar variável", () => {
    for (const v of VARS) vi.stubEnv(v, "x");
    expect(configMeta()).toEqual({
      appId: "x",
      appSecret: "x",
      loginConfigId: "x",
      verifyToken: "x",
      cronSecret: "x",
    });
    vi.stubEnv("CRON_SECRET", "");
    expect(configMeta()).toBeNull();
  });

  it("urlDeLogin monta o diálogo com config_id e devolve null sem config", () => {
    for (const v of VARS) vi.stubEnv(v, "");
    expect(urlDeLogin("st", "https://a/b/")).toBeNull();
    vi.stubEnv("META_APP_ID", "app1");
    vi.stubEnv("META_APP_SECRET", "sec");
    vi.stubEnv("META_LOGIN_CONFIG_ID", "cfg9");
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "v");
    vi.stubEnv("CRON_SECRET", "c");
    const u = new URL(urlDeLogin("st", "https://a/b/") as string);
    expect(u.hostname).toBe("www.facebook.com");
    expect(u.pathname).toBe(`/${GRAPH_VERSAO}/dialog/oauth`);
    expect(u.searchParams.get("client_id")).toBe("app1");
    expect(u.searchParams.get("config_id")).toBe("cfg9");
    expect(u.searchParams.get("state")).toBe("st");
    expect(u.searchParams.get("redirect_uri")).toBe("https://a/b/");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("override_default_response_type")).toBe("true");
    expect(u.toString()).not.toContain("sec");
  });

  it("trocarCodigo devolve null sem config e token com config", async () => {
    for (const v of VARS) vi.stubEnv(v, "");
    expect(await trocarCodigo("c", "https://a/")).toBeNull();
    vi.stubEnv("META_APP_ID", "app1");
    vi.stubEnv("META_APP_SECRET", "sec");
    vi.stubEnv("META_LOGIN_CONFIG_ID", "cfg9");
    vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "v");
    vi.stubEnv("CRON_SECRET", "c");
    const f = fakeFetch(resp(200, { access_token: "NOVO" }));
    vi.stubGlobal("fetch", f);
    expect(await trocarCodigo("c", "https://a/")).toEqual({ token: "NOVO" });
    const [u, i] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(u).not.toContain("sec");
    expect(String(i.body)).toContain("client_secret=sec");
    vi.stubGlobal("fetch", fakeFetch(new Error("rede")));
    expect(await trocarCodigo("c", "https://a/")).toBeNull();
  });

  it("contaAtribuida e assinarWebhooks usam Bearer e nunca lançam", async () => {
    const f1 = fakeFetch(
      resp(200, { data: [{ id: "17", username: "rt", name: "RT", profile_picture_url: "http://f" }] }),
    );
    vi.stubGlobal("fetch", f1);
    expect(await contaAtribuida(TOKEN)).toEqual({
      igUserId: "17",
      username: "rt",
      nome: "RT",
      fotoUrl: "http://f",
    });
    const [url, init] = f1.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain(TOKEN);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);

    vi.stubGlobal("fetch", fakeFetch(resp(200, { data: [] })));
    expect(await contaAtribuida(TOKEN)).toBeNull();

    const f2 = fakeFetch(resp(200, { success: true }));
    vi.stubGlobal("fetch", f2);
    expect(await assinarWebhooks(TOKEN, IG)).toBe(true);
    const [u2, i2] = f2.mock.calls[0] as unknown as [string, RequestInit];
    expect(i2.method).toBe("POST");
    expect(decodeURIComponent(u2)).toContain("subscribed_fields=comments,messages,messaging_postbacks");
    expect(u2).toContain(`/${IG}/subscribed_apps`);

    vi.stubGlobal("fetch", fakeFetch(new Error(TOKEN)));
    expect(await assinarWebhooks(TOKEN, IG)).toBe(false);
    expect(JSON.stringify(erros)).not.toContain(TOKEN);
  });
});
