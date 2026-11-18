import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GRAPH_BASE, GRAPH_VERSAO } from "@/lib/instagram/graph";
import { configWhatsApp } from "@/lib/whatsapp/config";
import { criarCloud } from "@/lib/whatsapp/cloud";

const TOKEN = "TOKEN-SECRETO-123";
const NUM = "100200300";

function resp(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status });
}

function fakeFetch(r: Response | Error) {
  return vi.fn(async (_u: string, _i?: RequestInit) => {
    if (r instanceof Error) throw r;
    return r;
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("cloud: enviar", () => {
  it("devolve metaId e envia to/messaging_product com Bearer", async () => {
    const f = fakeFetch(resp(200, { messages: [{ id: "wamid.1" }] }));
    const c = criarCloud(TOKEN, NUM, f as unknown as typeof fetch);
    const r = await c.enviar("5511999990000", { type: "template", template: { name: "x" } });
    expect(r).toEqual({ ok: true, metaId: "wamid.1" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`${GRAPH_BASE}/${GRAPH_VERSAO}/${NUM}/messages`);
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    const corpo = JSON.parse(String(init?.body));
    expect(corpo.to).toBe("5511999990000");
    expect(corpo.messaging_product).toBe("whatsapp");
    expect(corpo.recipient_type).toBe("individual");
    expect(corpo.type).toBe("template");
  });

  it("erro da Graph vira ok:false com codigo", async () => {
    const f = fakeFetch(resp(400, { error: { code: 131047, message: "fora da janela" } }));
    const c = criarCloud(TOKEN, NUM, f as unknown as typeof fetch);
    const r = await c.enviar("55", { type: "text" });
    expect(r).toMatchObject({ ok: false, status: 400, codigo: 131047, mensagem: "fora da janela" });
  });

  it("exceção de rede vira status 0 e não lança, sem vazar o token", async () => {
    const f = fakeFetch(new Error(`falhou ${TOKEN}`));
    const c = criarCloud(TOKEN, NUM, f as unknown as typeof fetch);
    const r = await c.enviar("55", {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(0);
      expect(r.mensagem).not.toContain(TOKEN);
    }
  });

  it("sucesso sem messages[0].id é falha", async () => {
    const f = fakeFetch(resp(200, {}));
    const c = criarCloud(TOKEN, NUM, f as unknown as typeof fetch);
    const r = await c.enviar("55", {});
    expect(r.ok).toBe(false);
  });
});

describe("cloud: texto", () => {
  it("manda type text com preview_url", async () => {
    const f = fakeFetch(resp(200, { messages: [{ id: "wamid.2" }] }));
    const c = criarCloud(TOKEN, NUM, f as unknown as typeof fetch);
    const r = await c.texto("55", "olá");
    expect(r).toEqual({ ok: true, metaId: "wamid.2" });
    const corpo = JSON.parse(String(f.mock.calls[0][1]?.body));
    expect(corpo.type).toBe("text");
    expect(corpo.text).toEqual({ body: "olá", preview_url: true });
  });
});

describe("cloud: infoDoNumero e assinarWebhooks", () => {
  it("lê número, nome e qualidade", async () => {
    const f = fakeFetch(
      resp(200, {
        display_phone_number: "+55 19 99999-0000",
        verified_name: "RT Capital",
        quality_rating: "GREEN",
      }),
    );
    const c = criarCloud(TOKEN, NUM, f as unknown as typeof fetch);
    expect(await c.infoDoNumero()).toEqual({
      numero: "+55 19 99999-0000",
      nomeExibicao: "RT Capital",
      qualidade: "GREEN",
    });
    const [url, init] = f.mock.calls[0];
    expect(init?.method).toBe("GET");
    expect(url).toContain(`/${NUM}?fields=display_phone_number%2Cverified_name%2Cquality_rating`);
  });

  it("infoDoNumero devolve null em erro", async () => {
    const c = criarCloud(TOKEN, NUM, fakeFetch(resp(401, { error: { code: 190 } })) as unknown as typeof fetch);
    expect(await c.infoDoNumero()).toBeNull();
  });

  it("assinarWebhooks faz POST em /<waba>/subscribed_apps", async () => {
    const f = fakeFetch(resp(200, { success: true }));
    const c = criarCloud(TOKEN, NUM, f as unknown as typeof fetch);
    expect(await c.assinarWebhooks("waba9")).toBe(true);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`${GRAPH_BASE}/${GRAPH_VERSAO}/waba9/subscribed_apps`);
    expect(init?.method).toBe("POST");
  });

  it("assinarWebhooks devolve false em erro", async () => {
    const c = criarCloud(TOKEN, NUM, fakeFetch(resp(400, { error: {} })) as unknown as typeof fetch);
    expect(await c.assinarWebhooks("waba9")).toBe(false);
  });
});

describe("configWhatsApp", () => {
  function env(v: Record<string, string>) {
    for (const k of [
      "WHATSAPP_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_WABA_ID",
      "META_APP_SECRET",
      "WHATSAPP_APP_SECRET",
    ])
      vi.stubEnv(k, v[k] ?? "");
  }
  const base = {
    WHATSAPP_TOKEN: "t",
    WHATSAPP_PHONE_NUMBER_ID: "p",
    WHATSAPP_WABA_ID: "w",
    META_APP_SECRET: "s1",
  };

  it("null sem WHATSAPP_TOKEN", () => {
    env({ ...base, WHATSAPP_TOKEN: "" });
    expect(configWhatsApp()).toBeNull();
  });
  it("null sem phoneNumberId ou wabaId", () => {
    env({ ...base, WHATSAPP_PHONE_NUMBER_ID: "" });
    expect(configWhatsApp()).toBeNull();
    env({ ...base, WHATSAPP_WABA_ID: "" });
    expect(configWhatsApp()).toBeNull();
  });
  it("null sem nenhum segredo", () => {
    env({ ...base, META_APP_SECRET: "" });
    expect(configWhatsApp()).toBeNull();
  });
  it("devolve os segredos não vazios", () => {
    env({ ...base, WHATSAPP_APP_SECRET: "s2" });
    expect(configWhatsApp()).toEqual({
      token: "t",
      phoneNumberId: "p",
      wabaId: "w",
      segredos: ["s1", "s2"],
    });
    env({ ...base });
    expect(configWhatsApp()?.segredos).toEqual(["s1"]);
  });
});
