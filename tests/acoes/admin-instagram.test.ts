import { beforeEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/instagram/motor-padrao", () => ({ graphPadrao: vi.fn() }));
vi.mock("@/lib/instagram/graph", () => ({ urlDeLogin: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { graphPadrao } from "@/lib/instagram/motor-padrao";
import { urlDeLogin } from "@/lib/instagram/graph";
import { ERRO_APENAS_ADMIN } from "@/lib/admin/auth";
import { TEXTOS_PADRAO } from "@/lib/instagram/textos-padrao";
import {
  alternarAutomacao,
  excluirAutomacao,
  excluirContato,
  iniciarConexao,
  listarPublicacoes,
  salvarAutomacao,
} from "@/app/actions/admin-instagram";

const ID = "11111111-1111-4111-8111-111111111111";

let falso: SupabaseFalso;

beforeEach(() => {
  vi.clearAllMocks();
  falso = criarSupabaseFalso();
  falso.definirUsuario({ id: "user-1" });
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
});

function entrada(extra: Record<string, unknown> = {}) {
  return {
    nome: "Lançamento Jabô",
    alvo: "qualquer",
    midiaId: null,
    palavras: null,
    responderPublico: false,
    frasesPublicas: [],
    dm1Texto: "Oi!",
    dm1Botao: "Quero o link",
    exigirSeguir: false,
    seguirTexto: TEXTOS_PADRAO.seguirTexto,
    seguirBotao: TEXTOS_PADRAO.seguirBotao,
    seguirInsisteTexto: TEXTOS_PADRAO.seguirInsisteTexto,
    linkTexto: "Link:",
    linkBotao: "Abrir",
    linkUrl: "https://rtcapitalimobiliario.com.br/",
    lembreteAtivo: true,
    lembreteHoras: 2,
    lembreteTexto: TEXTOS_PADRAO.lembreteTexto,
    retomadaBotaoTexto: TEXTOS_PADRAO.retomadaBotaoTexto,
    retomadaSeguirTexto: TEXTOS_PADRAO.retomadaSeguirTexto,
    retomadaLinkTexto: TEXTOS_PADRAO.retomadaLinkTexto,
    ...extra,
  } as never;
}

describe("acesso", () => {
  test("corretor recebe ERRO_APENAS_ADMIN em todas as ações", async () => {
    falso.definirPapel("corretor");
    const resultados = [
      await salvarAutomacao(entrada()),
      await alternarAutomacao(ID, true),
      await excluirAutomacao(ID),
      await excluirContato(ID),
      await listarPublicacoes(),
      await iniciarConexao(),
    ];
    for (const r of resultados) {
      expect(r).toEqual({ sucesso: false, erro: ERRO_APENAS_ADMIN });
    }
    expect(falso.chamadas.filter((c) => c.tabela.startsWith("ig_"))).toHaveLength(0);
  });
});

describe("salvarAutomacao", () => {
  test("cria com slug, criado_por e proxima_desde quando alvo é proxima", async () => {
    falso.programarResposta("ig_automacoes", "select", { data: [], error: null });
    falso.programarResposta("ig_automacoes", "insert", { data: { id: ID }, error: null });
    const r = await salvarAutomacao(entrada({ alvo: "proxima" }));
    expect(r).toEqual({ sucesso: true, id: ID });
    const ins = falso.chamadas.find((c) => c.operacao === "insert");
    const p = ins?.payload as Record<string, unknown>;
    expect(p.slug).toBe("lancamento-jabo");
    expect(p.criado_por).toBe("user-1");
    expect(typeof p.proxima_desde).toBe("string");
    expect(p.dm1_botao).toBe("Quero o link");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/instagram", "layout");
  });

  test("slug repetido ganha sufixo numérico", async () => {
    falso.programarResposta("ig_automacoes", "select", {
      data: [{ slug: "lancamento-jabo" }, { slug: "lancamento-jabo-2" }],
      error: null,
    });
    falso.programarResposta("ig_automacoes", "insert", { data: { id: ID }, error: null });
    await salvarAutomacao(entrada());
    const ins = falso.chamadas.find((c) => c.operacao === "insert");
    expect((ins?.payload as Record<string, unknown>).slug).toBe("lancamento-jabo-3");
  });

  test("proxima -> proxima não toca slug, criado_por, proxima_desde nem midia_id", async () => {
    falso.programarResposta("ig_automacoes", "select", { data: { alvo: "proxima" }, error: null });
    falso.programarResposta("ig_automacoes", "update", { data: [{ id: ID }], error: null });
    const r = await salvarAutomacao({ ...(entrada({ alvo: "proxima" }) as object), id: ID } as never);
    expect(r).toEqual({ sucesso: true, id: ID });
    const up = falso.chamadas.find((c) => c.operacao === "update");
    const p = up?.payload as Record<string, unknown>;
    expect(p).not.toHaveProperty("slug");
    expect(p).not.toHaveProperty("criado_por");
    expect(p).not.toHaveProperty("proxima_desde");
    expect(p).not.toHaveProperty("midia_id");
  });

  test("qualquer -> proxima grava proxima_desde e midia_id null", async () => {
    falso.programarResposta("ig_automacoes", "select", { data: { alvo: "qualquer" }, error: null });
    falso.programarResposta("ig_automacoes", "update", { data: [{ id: ID }], error: null });
    const r = await salvarAutomacao({ ...(entrada({ alvo: "proxima" }) as object), id: ID } as never);
    expect(r).toEqual({ sucesso: true, id: ID });
    const p = falso.chamadas.find((c) => c.operacao === "update")?.payload as Record<string, unknown>;
    expect(typeof p.proxima_desde).toBe("string");
    expect(p.midia_id).toBeNull();
    expect(p).not.toHaveProperty("slug");
    expect(p).not.toHaveProperty("criado_por");
  });

  test("update que não casa linha devolve erro", async () => {
    falso.programarResposta("ig_automacoes", "select", { data: { alvo: "qualquer" }, error: null });
    falso.programarResposta("ig_automacoes", "update", { data: [], error: null });
    const r = await salvarAutomacao({ ...(entrada() as object), id: ID } as never);
    expect(r.sucesso).toBe(false);
    expect(r.erro).toBeTruthy();
  });

  test("entrada inválida é recusada sem gravar", async () => {
    const r = await salvarAutomacao(entrada({ lembreteHoras: 24 }));
    expect(r.sucesso).toBe(false);
    expect(falso.chamadas.some((c) => c.operacao === "insert" || c.operacao === "update")).toBe(false);
  });
});

describe("alternar / excluir", () => {
  test("alternarAutomacao sem linha casada devolve erro", async () => {
    falso.programarResposta("ig_automacoes", "update", { data: [], error: null });
    const r = await alternarAutomacao(ID, false);
    expect(r.sucesso).toBe(false);
  });

  test("alternarAutomacao grava ativa", async () => {
    falso.programarResposta("ig_automacoes", "update", { data: [{ id: ID }], error: null });
    const r = await alternarAutomacao(ID, false);
    expect(r).toEqual({ sucesso: true });
    expect(falso.chamadas.find((c) => c.operacao === "update")?.payload).toEqual({ ativa: false });
  });

  test("excluirAutomacao e excluirContato confirmam linha apagada", async () => {
    falso.programarResposta("ig_automacoes", "delete", { data: [], error: null });
    expect((await excluirAutomacao(ID)).sucesso).toBe(false);
    falso.programarResposta("ig_contatos", "delete", { data: [{ id: ID }], error: null });
    expect(await excluirContato(ID)).toEqual({ sucesso: true });
  });

  test("id que não é uuid é recusado", async () => {
    expect((await excluirContato("x")).sucesso).toBe(false);
  });
});

describe("listarPublicacoes", () => {
  test("sem conta devolve a mensagem de conectar", async () => {
    vi.mocked(graphPadrao).mockResolvedValue(null);
    expect(await listarPublicacoes()).toEqual({ sucesso: false, erro: "Conecte o Instagram primeiro." });
  });

  test("devolve as 24 mais recentes", async () => {
    const publicacoes = vi.fn().mockResolvedValue([{ id: "1" }]);
    vi.mocked(graphPadrao).mockResolvedValue({ publicacoes } as never);
    const r = await listarPublicacoes();
    expect(publicacoes).toHaveBeenCalledWith(24);
    expect(r).toEqual({ sucesso: true, publicacoes: [{ id: "1" }] });
  });
});

describe("iniciarConexao", () => {
  test("grava o cookie de state e devolve a URL com o mesmo state", async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ set } as never);
    vi.mocked(urlDeLogin).mockImplementation(
      (state, redirect) => `https://fb.test/dialog/oauth?config_id=cfg&state=${state}&redirect_uri=${redirect}`,
    );
    const r = await iniciarConexao();
    expect(r.sucesso).toBe(true);
    const [nome, valor, opcoes] = set.mock.calls[0];
    expect(nome).toBe("ig_oauth_state");
    expect(opcoes).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    expect(r.url).toContain("config_id=cfg");
    expect(r.url).toContain(`state=${valor}`);
    expect(vi.mocked(urlDeLogin).mock.calls[0][1]).toBe(
      "https://rtcapitalimobiliario.com.br/api/meta/instagram/retorno/",
    );
  });

  test("sem configuração da Meta devolve erro", async () => {
    vi.mocked(cookies).mockResolvedValue({ set: vi.fn() } as never);
    vi.mocked(urlDeLogin).mockReturnValue(null);
    expect(await iniciarConexao()).toEqual({ sucesso: false, erro: "Configuração da Meta ausente." });
  });
});
