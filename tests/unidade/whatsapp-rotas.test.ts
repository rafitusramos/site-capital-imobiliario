import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RepositorioWaFalso } from "../apoio/whatsapp-falsos";
import { RepositorioFalso } from "../apoio/instagram-falsos";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    pendentes.push(Promise.resolve().then(fn));
  },
}));

const pendentes: Promise<unknown>[] = [];
const configMeta = vi.fn();
const configWhatsApp = vi.fn();
const motorIg = {
  processarEvento: vi.fn(async () => {}),
  dispararFila: vi.fn(async () => ({ enviados: 2, falhas: 1 })),
  reprocessarPendentes: vi.fn(async () => 0),
};
const motorWa = {
  processarEvento: vi.fn(async () => {}),
  dispararFila: vi.fn(async () => ({ enviados: 3, falhas: 0 })),
  reprocessarPendentes: vi.fn(async () => {}),
};
let repoIg: RepositorioFalso;
let repoWa: RepositorioWaFalso;
let motorWaDisponivel = true;

vi.mock("@/lib/instagram/config", () => ({ configMeta: () => configMeta() }));
vi.mock("@/lib/instagram/motor-padrao", () => ({
  motorPadrao: async () => motorIg,
  repositorioPadrao: () => repoIg,
}));
vi.mock("@/lib/whatsapp/config", () => ({ configWhatsApp: () => configWhatsApp() }));
vi.mock("@/lib/whatsapp/motor-padrao", () => ({ motorWaPadrao: () => (motorWaDisponivel ? motorWa : null) }));
vi.mock("@/lib/whatsapp/repositorio", () => ({ criarRepositorioWa: () => repoWa }));

import { POST as webhookPost } from "@/app/api/meta/webhook/route";
import { POST as disparar } from "@/app/api/meta/disparar/route";

const CFG_IG = { appId: "a", appSecret: "segredo-ig", loginConfigId: "l", verifyToken: "vt", cronSecret: "cron" };
const CFG_WA = { token: "t", phoneNumberId: "p", wabaId: "w", segredos: ["segredo-ig", "segredo-wa"] };
const URL_WH = "https://x.test/api/meta/webhook/";

const corpoWa = (id: string) =>
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ wa_id: "5519999991234", profile: { name: "Maria" } }],
              messages: [{ from: "5519999991234", id, timestamp: "1700000000", type: "text", text: { body: "oi" } }],
            },
          },
        ],
      },
    ],
  });
const corpoIg = JSON.stringify({
  object: "instagram",
  entry: [
    {
      id: "17841400000000001",
      time: 1,
      changes: [
        { field: "comments", value: { id: "c1", text: "quero", from: { id: "p1", username: "u" }, media: { id: "m1" } } },
      ],
    },
  ],
});
const assinar = (c: string, segredo: string) => "sha256=" + createHmac("sha256", segredo).update(c).digest("hex");
const post = (corpo: string, assinatura: string | null) =>
  webhookPost(
    new Request(URL_WH, { method: "POST", body: corpo, headers: assinatura ? { "x-hub-signature-256": assinatura } : {} }),
  );

beforeEach(() => {
  pendentes.length = 0;
  vi.clearAllMocks();
  configMeta.mockReturnValue(CFG_IG);
  configWhatsApp.mockReturnValue(CFG_WA);
  repoIg = new RepositorioFalso(() => new Date());
  repoWa = new RepositorioWaFalso();
  motorWaDisponivel = true;
});

describe("webhook POST (WhatsApp)", () => {
  test("assinatura do segredo do WhatsApp: 200, grava com a chave wa:, toca e processa em after", async () => {
    const c = corpoWa("wamid.1");
    const espia = vi.spyOn(repoWa, "registrarEventos");
    const r = await post(c, assinar(c, "segredo-wa"));
    expect(r.status).toBe(200);
    await Promise.all(pendentes);
    expect(repoWa.eventos).toEqual(["wa:m:wamid.1"]);
    expect(espia.mock.calls[0][0][0].payload).toMatchObject({ tipo: "mensagem", metaId: "wamid.1" });
    expect(repoWa.toques).toBe(1);
    expect(motorWa.processarEvento).toHaveBeenCalledTimes(1);
    expect(motorIg.processarEvento).not.toHaveBeenCalled();
  });
  test("o segredo do Instagram também vale (lista de segredos)", async () => {
    const c = corpoWa("wamid.2");
    expect((await post(c, assinar(c, "segredo-ig"))).status).toBe(200);
  });
  test("assinatura inválida 401 e nada gravado", async () => {
    const c = corpoWa("wamid.3");
    expect((await post(c, assinar(c, "outro"))).status).toBe(401);
    expect((await post(c, null)).status).toBe(401);
    expect(repoWa.eventos).toHaveLength(0);
    expect(motorWa.processarEvento).not.toHaveBeenCalled();
  });
  test("sem variáveis do WhatsApp: 200 sem processar", async () => {
    configWhatsApp.mockReturnValue(null);
    const c = corpoWa("wamid.4");
    expect((await post(c, assinar(c, "segredo-wa"))).status).toBe(200);
    await Promise.all(pendentes);
    expect(repoWa.eventos).toHaveLength(0);
    expect(motorWa.processarEvento).not.toHaveBeenCalled();
  });
  test("sem variáveis do Instagram continua 503", async () => {
    configMeta.mockReturnValue(null);
    const c = corpoWa("wamid.5");
    expect((await post(c, assinar(c, "segredo-wa"))).status).toBe(503);
  });
  test("evento repetido não reprocessa", async () => {
    const c = corpoWa("wamid.6");
    await post(c, assinar(c, "segredo-wa"));
    await Promise.all(pendentes);
    await post(c, assinar(c, "segredo-wa"));
    await Promise.all(pendentes);
    expect(motorWa.processarEvento).toHaveBeenCalledTimes(1);
  });
  test("falha ao gravar responde 500 (a Meta reentrega)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    repoWa.registrarEventos = async () => {
      throw new Error("db");
    };
    const c = corpoWa("wamid.7");
    expect((await post(c, assinar(c, "segredo-wa"))).status).toBe(500);
  });
  test("tocarUltimoEvento falhando não impede 200 nem o processamento", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    repoWa.tocarUltimoEvento = async () => {
      throw new Error("db");
    };
    const c = corpoWa("wamid.8");
    expect((await post(c, assinar(c, "segredo-wa"))).status).toBe(200);
    await Promise.all(pendentes);
    expect(motorWa.processarEvento).toHaveBeenCalledTimes(1);
  });
  test("corpo do Instagram continua chamando o motor do Instagram", async () => {
    const r = await post(corpoIg, assinar(corpoIg, "segredo-ig"));
    expect(r.status).toBe(200);
    await Promise.all(pendentes);
    expect(motorIg.processarEvento).toHaveBeenCalledTimes(1);
    expect(motorWa.processarEvento).not.toHaveBeenCalled();
  });
  test("corpo do Instagram com assinatura do segredo do WhatsApp continua 401", async () => {
    expect((await post(corpoIg, assinar(corpoIg, "segredo-wa"))).status).toBe(401);
  });
});

describe("disparar (os dois motores)", () => {
  const chamar = () =>
    disparar(
      new Request("https://x.test/api/meta/disparar/", { method: "POST", headers: { authorization: "Bearer cron" } }),
    );
  test("chama reprocessarPendentes(20) e dispararFila(20) nos dois e devolve os dois resultados", async () => {
    const r = await chamar();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      instagram: { enviados: 2, falhas: 1 },
      whatsapp: { enviados: 3, falhas: 0 },
    });
    expect(motorWa.reprocessarPendentes).toHaveBeenCalledWith(20);
    expect(motorWa.dispararFila).toHaveBeenCalledWith(20);
    expect(motorWa.reprocessarPendentes.mock.invocationCallOrder[0]).toBeLessThan(
      motorWa.dispararFila.mock.invocationCallOrder[0],
    );
  });
  test("motor do Instagram lançando não derruba o do WhatsApp", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    motorIg.dispararFila.mockRejectedValueOnce(new Error("boom"));
    const r = await chamar();
    expect(motorWa.dispararFila).toHaveBeenCalledWith(20);
    expect((await r.json()).whatsapp).toEqual({ enviados: 3, falhas: 0 });
  });
  test("motor do WhatsApp lançando não derruba o do Instagram", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    motorWa.dispararFila.mockRejectedValueOnce(new Error("boom"));
    const r = await chamar();
    expect(r.status).toBe(200);
    expect((await r.json()).instagram).toEqual({ enviados: 2, falhas: 1 });
  });
  test("sem motor do WhatsApp o Instagram segue", async () => {
    motorWaDisponivel = false;
    const r = await chamar();
    expect(await r.json()).toEqual({ instagram: { enviados: 2, falhas: 1 }, whatsapp: null });
  });
  test("401 sem Bearer", async () => {
    const r = await disparar(new Request("https://x.test/api/meta/disparar/", { method: "POST" }));
    expect(r.status).toBe(401);
    expect(motorWa.dispararFila).not.toHaveBeenCalled();
  });
});
