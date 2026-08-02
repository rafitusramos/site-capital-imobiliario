import { afterEach, describe, expect, test, vi } from "vitest";
import sharp from "sharp";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  despublicarImovel,
  excluirImovel,
  publicarImovel,
  salvarDiferenciais,
  salvarFaqs,
  salvarImagens,
  salvarImovel,
  salvarTipologias,
  uploadImagemImovel,
  type SalvarImovelInput,
} from "@/app/actions/admin-imoveis";
import type {
  DiferencialInput,
  FaqInput,
  ImagemInput,
  TipologiaInput,
} from "@/lib/validations/imovel";

const TIPO_UUID = "123e4567-e89b-12d3-a456-426614174001";
const FASE_UUID = "123e4567-e89b-12d3-a456-426614174002";

function montarSupabase() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  return falso;
}

/**
 * Fixture completo de propósito, com toda chave presente — é exatamente o que
 * montarPayloadDados() em components/admin/ImovelEditor.tsx envia. Omitir uma
 * chave numérica opcional reprovaria sob Zod 4.4.3; ver a armadilha documentada
 * em tests/validacoes/imovel.test.ts.
 */
function imovelValido(): SalvarImovelInput {
  return {
    titulo: "Residencial Jardim das Palmeiras",
    slug: "residencial-jardim-das-palmeiras",
    tipo_id: TIPO_UUID,
    fase_id: FASE_UUID,
    // Campos de texto vão como "" e não null: o helper `opcional` rejeita null
    // em runtime, apesar de o tipo inferido declarar `string | null`.
    bairro: "",
    cidade: "",
    estado: "",
    endereco: "",
    cep: "",
    area_min: null,
    area_max: null,
    dormitorios_min: null,
    dormitorios_max: null,
    banheiros_min: null,
    banheiros_max: null,
    vagas_min: null,
    vagas_max: null,
    valor_a_partir_de: null,
    valor_sob_consulta: false,
    previsao_entrega: "",
    video_youtube_url: "",
    construtora: "",
    construtora_logo_url: "",
    descricao_breve: "",
    descricao_completa: "",
    descricao_unidades: "",
    seo_title: "",
    seo_description: "",
    ordem: 0,
  };
}

function tipologiaValida(extra: Partial<TipologiaInput> = {}): TipologiaInput {
  return {
    nome: "2 dormitórios",
    area: null,
    dormitorios: null,
    suites: null,
    banheiros: null,
    vagas: null,
    valor_a_partir_de: null,
    planta_url: "",
    ordem: 0,
    ...extra,
  };
}

function arquivo(nome: string, conteudo: string | Uint8Array, tipo: string): File {
  return new File([conteudo], nome, { type: tipo });
}

/**
 * JPEG de verdade — a partir de `enviarImagem` passar pela marca d'água
 * (lib/imoveis/marca-dagua.ts), que decodifica com `sharp`, o antigo
 * `arquivo("foto.jpg", "conteudo", ...)` não serve mais: "conteudo" não é
 * um JPEG válido e o upload passaria a falhar no decode.
 */
async function arquivoJpegValido(nome = "foto.jpg"): Promise<File> {
  const bytes = await sharp({
    create: { width: 20, height: 20, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .jpeg()
    .toBuffer();
  return new File([bytes], nome, { type: "image/jpeg" });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("sessão expirada", () => {
  const acoes: Array<[string, () => Promise<unknown>]> = [
    ["salvarImovel", () => salvarImovel(imovelValido())],
    ["publicarImovel", () => publicarImovel("imovel-1", "residencial-jardim")],
    ["despublicarImovel", () => despublicarImovel("imovel-1", "residencial-jardim")],
    ["excluirImovel", () => excluirImovel("imovel-1", "residencial-jardim")],
    ["uploadImagemImovel", () => uploadImagemImovel(new FormData())],
    ["salvarImagens", () => salvarImagens("imovel-1", "residencial-jardim", [])],
    ["salvarTipologias", () => salvarTipologias("imovel-1", "residencial-jardim", [])],
    ["salvarDiferenciais", () => salvarDiferenciais("imovel-1", "residencial-jardim", [])],
    ["salvarFaqs", () => salvarFaqs("imovel-1", "residencial-jardim", [])],
  ];

  test.each(acoes)("%s sem usuário autenticado devolve erro de sessão", async (_nome, chamar) => {
    montarSupabase().definirUsuario(null);
    const resultado = await chamar();
    expect(resultado).toMatchObject({
      sucesso: false,
      erro: "Sessão expirada. Faça login novamente.",
    });
  });
});

describe("salvarImovel", () => {
  test("novo empreendimento nasce com status inativo", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "insert", { data: { id: "imovel-novo" }, error: null });

    const resultado = await salvarImovel(imovelValido());

    expect(resultado).toEqual({ sucesso: true, id: "imovel-novo" });
    const chamada = falso.chamadas.find((c) => c.tabela === "imoveis" && c.operacao === "insert");
    expect(chamada).toBeDefined();
    expect((chamada!.payload as Record<string, unknown>).status).toBe("inativo");
  });

  test("com id faz update e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "update", { data: null, error: null });

    const resultado = await salvarImovel({ ...imovelValido(), id: "imovel-existente" });

    expect(resultado).toEqual({ sucesso: true, id: "imovel-existente" });
    const chamada = falso.chamadas.find((c) => c.tabela === "imoveis" && c.operacao === "update");
    expect(chamada).toBeDefined();
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim-das-palmeiras");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });

  test("erro 23505 vira mensagem de slug duplicado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "insert", { data: null, error: { code: "23505" } });

    const resultado = await salvarImovel(imovelValido());

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Já existe um empreendimento com esse slug.",
    });
  });
});

describe("publicarImovel", () => {
  test("grava status ativo e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "update", { data: null, error: null });

    const resultado = await publicarImovel("imovel-1", "residencial-jardim");

    expect(resultado).toEqual({ sucesso: true, id: "imovel-1" });
    const chamada = falso.chamadas.find((c) => c.tabela === "imoveis" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).status).toBe("ativo");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});

describe("despublicarImovel", () => {
  test("grava status inativo e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "update", { data: null, error: null });

    const resultado = await despublicarImovel("imovel-1", "residencial-jardim");

    expect(resultado).toEqual({ sucesso: true, id: "imovel-1" });
    const chamada = falso.chamadas.find((c) => c.tabela === "imoveis" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).status).toBe("inativo");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});

describe("excluirImovel", () => {
  test("deleta e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "delete", { data: null, error: null });

    const resultado = await excluirImovel("imovel-1", "residencial-jardim");

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "imoveis" && c.operacao === "delete");
    expect(chamada).toBeDefined();
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});

describe("uploadImagemImovel", () => {
  test("sem arquivo devolve 'Selecione uma imagem.'", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await uploadImagemImovel(new FormData());

    expect(resultado).toEqual({ sucesso: false, erro: "Selecione uma imagem." });
  });

  test("tipo não suportado devolve mensagem de formato", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = new FormData();
    fd.set("arquivo", arquivo("foto.txt", "conteudo", "text/plain"));

    const resultado = await uploadImagemImovel(fd);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Formato não suportado. Use JPEG, PNG, WEBP ou GIF.",
    });
  });

  test("arquivo maior que 5MB devolve mensagem de tamanho", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const grande = new Uint8Array(6 * 1024 * 1024);
    const fd = new FormData();
    fd.set("arquivo", arquivo("foto.jpg", grande, "image/jpeg"));

    const resultado = await uploadImagemImovel(fd);

    expect(resultado).toEqual({ sucesso: false, erro: "Imagem maior que 5MB." });
  });

  test("sucesso devolve a publicUrl no bucket imovel-images, marcada com o selo", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarUpload("imovel-images", { data: { path: "xyz.webp" }, error: null });
    falso.programarPublicUrl("imovel-images", "https://cdn.example.com/imovel-images/xyz.webp");
    const fd = new FormData();
    fd.set("arquivo", await arquivoJpegValido());

    const resultado = await uploadImagemImovel(fd);

    expect(resultado).toEqual({
      sucesso: true,
      url: "https://cdn.example.com/imovel-images/xyz.webp",
    });

    // Sobe nos dois buckets: original sem marca no privado, marcado no público.
    const uploads = falso.chamadasStorage.filter((c) => c.metodo === "upload");
    expect(uploads.map((u) => u.bucket).sort()).toEqual(
      ["imovel-images", "imovel-images-originais"].sort(),
    );

    const uploadPublico = uploads.find((u) => u.bucket === "imovel-images");
    const opcoesPublico = uploadPublico?.args[2] as Record<string, unknown> | undefined;
    expect(opcoesPublico?.contentType).toBe("image/webp");
  });

  test("erro ao subir o original aborta antes de marcar", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarUpload("imovel-images-originais", { data: null, error: { message: "falha" } });
    const fd = new FormData();
    fd.set("arquivo", await arquivoJpegValido());

    const resultado = await uploadImagemImovel(fd);

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível enviar a imagem." });
    const uploads = falso.chamadasStorage.filter((c) => c.metodo === "upload");
    expect(uploads).toHaveLength(1);
    expect(uploads[0]?.bucket).toBe("imovel-images-originais");
  });

  test("arquivo que não decodifica como imagem devolve erro de processamento", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = new FormData();
    fd.set("arquivo", arquivo("foto.jpg", "isso não é um jpeg de verdade", "image/jpeg"));

    const resultado = await uploadImagemImovel(fd);

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível processar a imagem." });
  });
});

const IMG_1 = "11111111-1111-4111-8111-111111111111";
const IMG_2 = "22222222-2222-4222-8222-222222222222";
const IMG_3 = "33333333-3333-4333-8333-333333333333";

describe("salvarImagens — reconciliação da coleção", () => {
  test("itens existentes fora do array recebido são removidos via .in", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", {
      data: [{ id: IMG_1 }, { id: IMG_2 }, { id: IMG_3 }],
      error: null,
    });
    falso.programarResposta("imovel_imagens", "delete", { data: null, error: null });
    falso.programarResposta("imovel_imagens", "update", { data: null, error: null });

    const itens = [
      { id: IMG_1, url: "/a.jpg", ambiente: "", grupo: "empreendimento" as const, ordem: 0, destaque: false },
    ];

    const resultado = await salvarImagens("imovel-1", "residencial-jardim", itens);

    expect(resultado).toEqual({ sucesso: true });
    const chamadaDelete = falso.chamadas.find(
      (c) => c.tabela === "imovel_imagens" && c.operacao === "delete",
    );
    expect(chamadaDelete).toBeDefined();
    const filtroIn = chamadaDelete!.filtros.find((f) => f.metodo === "in");
    expect(filtroIn?.args).toEqual(["id", [IMG_2, IMG_3]]);
  });

  test("item com id vira update", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", { data: [{ id: IMG_1 }], error: null });
    falso.programarResposta("imovel_imagens", "update", { data: null, error: null });

    const itens = [
      { id: IMG_1, url: "/a.jpg", ambiente: "", grupo: "empreendimento" as const, ordem: 0, destaque: true },
    ];

    await salvarImagens("imovel-1", "residencial-jardim", itens);

    const chamadaUpdate = falso.chamadas.find(
      (c) => c.tabela === "imovel_imagens" && c.operacao === "update",
    );
    expect(chamadaUpdate).toBeDefined();
    const payload = chamadaUpdate!.payload as Record<string, unknown>;
    expect(payload.id).toBeUndefined();
    expect(payload.url).toBe("/a.jpg");
  });

  test("item sem id vira insert com imovel_id injetado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", { data: [], error: null });
    falso.programarResposta("imovel_imagens", "insert", { data: null, error: null });

    const itens: ImagemInput[] = [
      { url: "/nova.jpg", ambiente: "", grupo: "decorado", ordem: 1, destaque: false },
    ];

    await salvarImagens("imovel-1", "residencial-jardim", itens);

    const chamadaInsert = falso.chamadas.find(
      (c) => c.tabela === "imovel_imagens" && c.operacao === "insert",
    );
    expect(chamadaInsert).toBeDefined();
    const payload = chamadaInsert!.payload as Record<string, unknown>;
    expect(payload.imovel_id).toBe("imovel-1");
    expect(payload.url).toBe("/nova.jpg");
  });

  test("quando nada foi removido, delete não é chamado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", { data: [{ id: IMG_1 }], error: null });
    falso.programarResposta("imovel_imagens", "update", { data: null, error: null });

    const itens = [
      { id: IMG_1, url: "/a.jpg", ambiente: "", grupo: "empreendimento" as const, ordem: 0, destaque: false },
    ];

    await salvarImagens("imovel-1", "residencial-jardim", itens);

    const chamadaDelete = falso.chamadas.find(
      (c) => c.tabela === "imovel_imagens" && c.operacao === "delete",
    );
    expect(chamadaDelete).toBeUndefined();
  });

  test("erro ao ler existentes devolve mensagem específica de leitura", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", {
      data: null,
      error: { message: "falha" },
    });

    const resultado = await salvarImagens("imovel-1", "residencial-jardim", []);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Não foi possível ler as imagens existentes.",
    });
  });

  test("erro no delete devolve mensagem específica de remoção", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", { data: [{ id: "img-1" }], error: null });
    falso.programarResposta("imovel_imagens", "delete", {
      data: null,
      error: { message: "falha" },
    });

    const resultado = await salvarImagens("imovel-1", "residencial-jardim", []);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Não foi possível remover as imagens excluídas.",
    });
  });

  test("erro no insert/update devolve mensagem específica de gravação", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", { data: [], error: null });
    falso.programarResposta("imovel_imagens", "insert", {
      data: null,
      error: { message: "falha" },
    });

    const itens: ImagemInput[] = [
      { url: "/nova.jpg", ambiente: "", grupo: "decorado", ordem: 1, destaque: false },
    ];
    const resultado = await salvarImagens("imovel-1", "residencial-jardim", itens);

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível salvar as imagens." });
  });

  test("sucesso revalida /imoveis, /imoveis/<slug> e /sitemap.xml", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_imagens", "select", { data: [], error: null });

    await salvarImagens("imovel-1", "residencial-jardim", []);

    expect(revalidatePath).toHaveBeenCalledWith("/imoveis");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});

describe("salvarTipologias — caso de sucesso", () => {
  test("reconcilia e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_tipologias", "select", {
      data: [{ id: "tip-antiga" }],
      error: null,
    });
    falso.programarResposta("imovel_tipologias", "delete", { data: null, error: null });
    falso.programarResposta("imovel_tipologias", "insert", { data: null, error: null });

    const itens = [tipologiaValida({ area: 68 })];
    const resultado = await salvarTipologias("imovel-1", "residencial-jardim", itens);

    expect(resultado).toEqual({ sucesso: true });
    const chamadaDelete = falso.chamadas.find(
      (c) => c.tabela === "imovel_tipologias" && c.operacao === "delete",
    );
    expect(chamadaDelete?.filtros.find((f) => f.metodo === "in")?.args).toEqual([
      "id",
      ["tip-antiga"],
    ]);
    const chamadaInsert = falso.chamadas.find(
      (c) => c.tabela === "imovel_tipologias" && c.operacao === "insert",
    );
    expect((chamadaInsert!.payload as Record<string, unknown>).imovel_id).toBe("imovel-1");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
  });
});

describe("salvarDiferenciais — caso de sucesso", () => {
  test("reconcilia e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_diferenciais", "select", { data: [], error: null });
    falso.programarResposta("imovel_diferenciais", "insert", { data: null, error: null });

    const itens: DiferencialInput[] = [
      { grupo: "lazer", nome: "Piscina", icone: "", ordem: 0 },
    ];
    const resultado = await salvarDiferenciais("imovel-1", "residencial-jardim", itens);

    expect(resultado).toEqual({ sucesso: true });
    const chamadaInsert = falso.chamadas.find(
      (c) => c.tabela === "imovel_diferenciais" && c.operacao === "insert",
    );
    expect((chamadaInsert!.payload as Record<string, unknown>).imovel_id).toBe("imovel-1");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
  });
});

describe("salvarFaqs — caso de sucesso", () => {
  test("reconcilia e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_faqs", "select", { data: [], error: null });
    falso.programarResposta("imovel_faqs", "insert", { data: null, error: null });

    const itens: FaqInput[] = [{ pergunta: "Aceita FGTS?", resposta: "Sim.", ordem: 0 }];
    const resultado = await salvarFaqs("imovel-1", "residencial-jardim", itens);

    expect(resultado).toEqual({ sucesso: true });
    const chamadaInsert = falso.chamadas.find(
      (c) => c.tabela === "imovel_faqs" && c.operacao === "insert",
    );
    expect((chamadaInsert!.payload as Record<string, unknown>).imovel_id).toBe("imovel-1");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
  });
});
