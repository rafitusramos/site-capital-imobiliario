import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RepositorioFalso } from "../apoio/instagram-falsos";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    pendentes.push(Promise.resolve().then(fn));
  },
}));

const pendentes: Promise<unknown>[] = [];
const configMeta = vi.fn();
const motor = {
  processarEvento: vi.fn(async () => {}),
  dispararFila: vi.fn(async () => ({ enviados: 2, falhas: 1 })),
  registrarClique: vi.fn<(c: string, ua: string | null) => Promise<string | null>>(async () => null),
};
let repo: RepositorioFalso;
let motorDisponivel = true;

vi.mock("@/lib/instagram/config", () => ({ configMeta: () => configMeta() }));
vi.mock("@/lib/instagram/motor-padrao", () => ({
  motorPadrao: async () => (motorDisponivel ? motor : null),
  repositorioPadrao: () => repo,
}));

import { GET as webhookGet, POST as webhookPost } from "@/app/api/meta/webhook/route";
import { POST as disparar } from "@/app/api/meta/disparar/route";
import { GET as ir } from "@/app/ir/[codigo]/route";
import { SITE_URL } from "@/lib/site";

const CFG = { appId: "a", appSecret: "segredo", loginConfigId: "l", verifyToken: "vt", cronSecret: "cron" };
const URL_WH = "https://x.test/api/meta/webhook/";

function corpoComentario(id: string) {
  return JSON.stringify({
    object: "instagram",
    entry: [
      {
        id: "17841400000000001",
        time: 1,
        changes: [
          {
            field: "comments",
            value: { id, text: "quero", from: { id: "p1", username: "u" }, media: { id: "m1" } },
          },
        ],
      },
    ],
  });
}
const assinar = (c: string) => "sha256=" + createHmac("sha256", "segredo").update(c).digest("hex");
const post = (corpo: string, assinatura: string | null) =>
  webhookPost(
    new Request(URL_WH, {
      method: "POST",
      body: corpo,
      headers: assinatura ? { "x-hub-signature-256": assinatura } : {},
    }),
  );

beforeEach(() => {
  pendentes.length = 0;
  vi.clearAllMocks();
  configMeta.mockReturnValue(CFG);
  repo = new RepositorioFalso(() => new Date());
  motorDisponivel = true;
});

describe("webhook GET", () => {
  const get = (q: string) => webhookGet(new Request(`${URL_WH}?${q}`));
  test("token certo devolve o challenge em texto puro", async () => {
    const r = await get("hub.mode=subscribe&hub.verify_token=vt&hub.challenge=123");
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("123");
  });
  test("token errado 403", async () => {
    expect((await get("hub.mode=subscribe&hub.verify_token=x&hub.challenge=1")).status).toBe(403);
  });
  test("sem config 503", async () => {
    configMeta.mockReturnValue(null);
    expect((await get("hub.mode=subscribe&hub.verify_token=vt&hub.challenge=1")).status).toBe(503);
  });
});

describe("webhook POST", () => {
  test("sem config 503", async () => {
    configMeta.mockReturnValue(null);
    expect((await post("{}", "sha256=00")).status).toBe(503);
  });
  test("assinatura errada 401 e nada gravado", async () => {
    const c = corpoComentario("c1");
    expect((await post(c, "sha256=deadbeef")).status).toBe(401);
    expect((await post(c, null)).status).toBe(401);
    expect(repo.eventosGravados).toHaveLength(0);
    expect(motor.processarEvento).not.toHaveBeenCalled();
  });
  test("corpo acima de 1 MB 413", async () => {
    const c = "x".repeat(1024 * 1024 + 1);
    expect((await post(c, assinar(c))).status).toBe(413);
  });
  test("válido: 200, grava o evento, toca ultimo_evento e processa em after", async () => {
    const c = corpoComentario("c1");
    const r = await post(c, assinar(c));
    expect(r.status).toBe(200);
    await Promise.all(pendentes);
    expect(repo.eventosGravados.map((e) => e.chave)).toEqual(["comentario:c1"]);
    expect(repo.toquesUltimoEvento).toBe(1);
    expect(motor.processarEvento).toHaveBeenCalledTimes(1);
  });
  test("evento repetido não reprocessa", async () => {
    const c = corpoComentario("c1");
    await post(c, assinar(c));
    await Promise.all(pendentes);
    await post(c, assinar(c));
    await Promise.all(pendentes);
    expect(motor.processarEvento).toHaveBeenCalledTimes(1);
  });
  test("conta desconectada: 200 sem gravar nem processar", async () => {
    repo.contaConectada = null;
    const c = corpoComentario("c1");
    expect((await post(c, assinar(c))).status).toBe(200);
    await Promise.all(pendentes);
    expect(repo.eventosGravados).toHaveLength(0);
    expect(motor.processarEvento).not.toHaveBeenCalled();
  });
});

describe("disparar", () => {
  const chamar = (auth?: string) =>
    disparar(
      new Request("https://x.test/api/meta/disparar/", {
        method: "POST",
        headers: auth ? { authorization: auth } : {},
      }),
    );
  test("sem config 503", async () => {
    configMeta.mockReturnValue(null);
    expect((await chamar("Bearer cron")).status).toBe(503);
  });
  test("sem Bearer ou com Bearer errado 401", async () => {
    expect((await chamar()).status).toBe(401);
    expect((await chamar("Bearer errado")).status).toBe(401);
    expect((await chamar("Bearer cro")).status).toBe(401);
    expect(motor.dispararFila).not.toHaveBeenCalled();
  });
  test("Bearer certo dispara a fila com 20", async () => {
    const r = await chamar("Bearer cron");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ enviados: 2, falhas: 1 });
    expect(motor.dispararFila).toHaveBeenCalledWith(20);
  });
  test("motor indisponível devolve zeros", async () => {
    motorDisponivel = false;
    const r = await chamar("Bearer cron");
    expect(await r.json()).toEqual({ enviados: 0, falhas: 0 });
  });
});

describe("/ir/[codigo]", () => {
  const chamar = (codigo: string, ua = "Mozilla") =>
    ir(new Request(`https://x.test/ir/${codigo}/`, { headers: { "user-agent": ua } }), {
      params: Promise.resolve({ codigo }),
    });
  test("código desconhecido 302 para o site", async () => {
    const r = await chamar("abc");
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe(SITE_URL);
  });
  test("código válido 302 para o destino com noindex", async () => {
    motor.registrarClique.mockResolvedValueOnce("https://destino.test/?utm=1");
    const r = await chamar("abc", "ua-x");
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://destino.test/?utm=1");
    expect(r.headers.get("x-robots-tag")).toBe("noindex");
    expect(motor.registrarClique).toHaveBeenCalledWith("abc", "ua-x");
  });
  test("sem motor 302 para o site", async () => {
    motorDisponivel = false;
    const r = await chamar("abc");
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe(SITE_URL);
  });
  test("motor lançando ainda redireciona para o site", async () => {
    motor.registrarClique.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await chamar("abc");
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe(SITE_URL);
  });
});
