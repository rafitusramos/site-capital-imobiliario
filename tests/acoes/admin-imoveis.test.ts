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

const UUID_IMOVEL = "33333333-3333-4333-8333-333333333333";
const UUID_IMOVEL_EXISTENTE = "44444444-4444-4444-8444-444444444444";

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
    ["publicarImovel", () => publicarImovel(UUID_IMOVEL, "residencial-jardim")],
    ["despublicarImovel", () => despublicarImovel(UUID_IMOVEL, "residencial-jardim")],
    ["excluirImovel", () => excluirImovel(UUID_IMOVEL, "residencial-jardim")],
    ["uploadImagemImovel", () => uploadImagemImovel(new FormData())],
    ["salvarImagens", () => salvarImagens(UUID_IMOVEL, "residencial-jardim", [])],
    ["salvarTipologias", () => salvarTipologias(UUID_IMOVEL, "residencial-jardim", [])],
    ["salvarDiferenciais", () => salvarDiferenciais(UUID_IMOVEL, "residencial-jardim", [])],
    ["salvarFaqs", () => salvarFaqs(UUID_IMOVEL, "residencial-jardim", [])],
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
  test("novo imóvel nasce com status inativo", async () => {
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
    falso.programarResposta("imoveis", "select", { data: { slug: "residencial-jardim-das-palmeiras" }, error: null });
    falso.programarResposta("imoveis", "update", { data: [{ id: "linha-1" }], error: null });

    const resultado = await salvarImovel({ ...imovelValido(), id: UUID_IMOVEL_EXISTENTE });

    expect(resultado).toEqual({ sucesso: true, id: UUID_IMOVEL_EXISTENTE });
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
      erro: "Já existe um imóvel com esse slug.",
    });
  });
});

describe("salvarImovel — imóvel pronto", () => {
  const FASE_PRONTO_UUID = "123e4567-e89b-12d3-a456-426614174099";

  function prontoValido(extra: Record<string, unknown> = {}): SalvarImovelInput {
    return {
      modalidade: "pronto",
      titulo: "Casa no Marambaia",
      slug: "casa-marambaia",
      tipo_id: TIPO_UUID,
      fase_id: "",
      bairro: "",
      cidade: "",
      estado: "",
      endereco: "",
      cep: "",
      valor_sob_consulta: false,
      video_youtube_url: "",
      video_data_publicacao: "",
      descricao_breve: "",
      descricao_completa: "",
      seo_title: "",
      seo_description: "",
      ordem: 0,
      area_util: 180,
      area_total: null,
      dormitorios: 3,
      suites: null,
      banheiros: null,
      vagas: 2,
      valor_venda: 1250000,
      valor_condominio: null,
      valor_iptu: null,
      nome_condominio: "",
      descricao_unidade: "",
      andar: null,
      mobiliado: null,
      ano_construcao: null,
      exibir_endereco: false,
      ...extra,
    } as SalvarImovelInput;
  }

  test("grava fase_id da fase 'pronto', mesmo sem o cliente enviar", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_fases", "select", { data: { id: FASE_PRONTO_UUID }, error: null });
    falso.programarResposta("imoveis", "insert", { data: { id: "imovel-novo" }, error: null });

    const resultado = await salvarImovel(prontoValido());

    expect(resultado).toEqual({ sucesso: true, id: "imovel-novo" });
    const fases = falso.chamadas.find((c) => c.tabela === "imovel_fases");
    expect(fases?.filtros).toContainEqual({ metodo: "eq", args: ["slug", "pronto"] });
    const insercao = falso.chamadas.find((c) => c.tabela === "imoveis" && c.operacao === "insert");
    expect(insercao!.payload).toMatchObject({
      modalidade: "pronto",
      fase_id: FASE_PRONTO_UUID,
      status: "inativo",
      valor_venda: 1250000,
    });
  });

  test("ignora um fase_id enviado pelo cliente", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_fases", "select", { data: { id: FASE_PRONTO_UUID }, error: null });
    falso.programarResposta("imoveis", "insert", { data: { id: "imovel-novo" }, error: null });

    await salvarImovel(prontoValido({ fase_id: FASE_UUID }));

    const insercao = falso.chamadas.find((c) => c.tabela === "imoveis" && c.operacao === "insert");
    expect((insercao!.payload as Record<string, unknown>).fase_id).toBe(FASE_PRONTO_UUID);
  });

  test("sem a fase 'pronto' cadastrada, não grava nada", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_fases", "select", { data: null, error: null });

    const resultado = await salvarImovel(prontoValido());

    expect(resultado.sucesso).toBe(false);
    expect(falso.chamadas.some((c) => c.tabela === "imoveis")).toBe(false);
  });

  test("lançamento não consulta imovel_fases", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "insert", { data: { id: "imovel-novo" }, error: null });

    await salvarImovel(imovelValido());

    expect(falso.chamadas.some((c) => c.tabela === "imovel_fases")).toBe(false);
  });

  test("não deixa trocar a modalidade de um imóvel existente", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imovel_fases", "select", { data: { id: FASE_PRONTO_UUID }, error: null });
    falso.programarResposta("imoveis", "select", {
      data: { slug: "casa-marambaia", modalidade: "lancamento" },
      error: null,
    });

    const resultado = await salvarImovel({ ...prontoValido(), id: UUID_IMOVEL_EXISTENTE });

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toMatch(/modalidade/i);
    expect(falso.chamadas.some((c) => c.operacao === "update")).toBe(false);
  });
});

describe("publicarImovel", () => {
  test("grava status ativo e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "update", { data: [{ id: "linha-1" }], error: null });

    const resultado = await publicarImovel(UUID_IMOVEL, "residencial-jardim");

    expect(resultado).toEqual({ sucesso: true, id: UUID_IMOVEL });
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
    falso.programarResposta("imoveis", "update", { data: [{ id: "linha-1" }], error: null });

    const resultado = await despublicarImovel(UUID_IMOVEL, "residencial-jardim");

    expect(resultado).toEqual({ sucesso: true, id: UUID_IMOVEL });
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
    falso.programarResposta("imoveis", "delete", { data: [{ id: "linha-1" }], error: null });

    const resultado = await excluirImovel(UUID_IMOVEL, "residencial-jardim");

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

const COLECOES: Array<{
  nome: string;
  rpc: string;
  executar: () => Promise<{ sucesso: boolean; erro?: string }>;
  erroGenerico: string;
}> = [
  {
    nome: "salvarImagens",
    rpc: "salvar_imovel_imagens",
    executar: () =>
      salvarImagens(UUID_IMOVEL, "residencial-jardim", [
        { id: IMG_1, url: "/a.jpg", ambiente: "", grupo: "empreendimento", ordem: 0, destaque: true },
        { url: "/nova.jpg", ambiente: "", grupo: "decorado", ordem: 1, destaque: false },
      ] as ImagemInput[]),
    erroGenerico: "Não foi possível salvar as imagens.",
  },
  {
    nome: "salvarTipologias",
    rpc: "salvar_imovel_tipologias",
    executar: () => salvarTipologias(UUID_IMOVEL, "residencial-jardim", [tipologiaValida({ area: 68 })]),
    erroGenerico: "Não foi possível salvar as tipologias.",
  },
  {
    nome: "salvarDiferenciais",
    rpc: "salvar_imovel_diferenciais",
    executar: () =>
      salvarDiferenciais(UUID_IMOVEL, "residencial-jardim", [
        { grupo: "lazer", nome: "Piscina", icone: "", ordem: 0 },
      ] as DiferencialInput[]),
    erroGenerico: "Não foi possível salvar os diferenciais.",
  },
  {
    nome: "salvarFaqs",
    rpc: "salvar_imovel_faqs",
    executar: () =>
      salvarFaqs(UUID_IMOVEL, "residencial-jardim", [
        { pergunta: "Aceita FGTS?", resposta: "Sim.", ordem: 0 },
      ] as FaqInput[]),
    erroGenerico: "Não foi possível salvar o FAQ.",
  },
];

describe.each(COLECOES)("$nome — gravação atômica por RPC", ({ rpc, executar, erroGenerico }) => {
  test("chama a RPC uma única vez, sem nenhuma escrita avulsa, e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc(rpc, { data: null, error: null });

    const resultado = await executar();

    expect(resultado).toEqual({ sucesso: true });
    expect(falso.chamadasRpc).toHaveLength(1);
    expect(falso.chamadasRpc[0]?.nome).toBe(rpc);
    expect(falso.chamadasRpc[0]?.params).toMatchObject({ p_imovel_id: UUID_IMOVEL });
    expect(falso.chamadas.filter((c) => c.operacao && c.operacao !== "select")).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });

  test("erro da RPC devolve a mensagem genérica e não revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc(rpc, { data: null, error: { message: "falha qualquer" } });

    const resultado = await executar();

    expect(resultado).toEqual({ sucesso: false, erro: erroGenerico });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("item de outro imóvel (ITEM_NAO_ENCONTRADO) vira mensagem específica", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarRpc(rpc, { data: null, error: { message: "ITEM_NAO_ENCONTRADO" } });

    const resultado = await executar();

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toMatch(/não pertence a este imóvel/);
  });

  test("corretor recebe o erro de admin e a RPC não é chamada", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "corretor-1" });
    falso.definirPapel("corretor");

    const resultado = await executar();

    expect(resultado).toEqual({ sucesso: false, erro: "Apenas administradores podem fazer isso." });
    expect(falso.chamadasRpc).toEqual([]);
  });
});

describe("coleções — validação", () => {
  test("o array enviado à RPC é o validado (ids preservados, vazio vira null)", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    await salvarImagens(UUID_IMOVEL, "residencial-jardim", [
      { id: IMG_2, url: "/a.jpg", ambiente: "", grupo: "empreendimento", ordem: 0, destaque: false },
    ] as ImagemInput[]);

    const params = falso.chamadasRpc[0]?.params as { p_itens: Array<Record<string, unknown>> };
    expect(params.p_itens).toHaveLength(1);
    expect(params.p_itens[0]?.id).toBe(IMG_2);
    expect(params.p_itens[0]?.ambiente).toBeNull();
  });

  test("imovelId que não é UUID é rejeitado sem chamar a RPC", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await salvarFaqs("imovel-1", "residencial-jardim", []);

    expect(resultado).toEqual({ sucesso: false, erro: "Imóvel inválido." });
    expect(falso.chamadasRpc).toEqual([]);
  });

  test("dados inválidos devolvem a mensagem do Zod sem chamar a RPC", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await salvarFaqs(UUID_IMOVEL, "residencial-jardim", [
      { pergunta: "", resposta: "Sim.", ordem: 0 },
    ] as FaqInput[]);

    expect(resultado).toEqual({ sucesso: false, erro: "Informe a pergunta." });
    expect(falso.chamadasRpc).toEqual([]);
  });
});

describe("permissão de administrador e integridade (conteúdo geral)", () => {
  const acoes: Array<[string, () => Promise<{ sucesso: boolean; erro?: string }>]> = [
    ["salvarImovel", () => salvarImovel(imovelValido())],
    ["salvarImovel (update)", () => salvarImovel({ ...imovelValido(), id: UUID_IMOVEL })],
    ["publicarImovel", () => publicarImovel(UUID_IMOVEL, "residencial-jardim")],
    ["despublicarImovel", () => despublicarImovel(UUID_IMOVEL, "residencial-jardim")],
    ["excluirImovel", () => excluirImovel(UUID_IMOVEL, "residencial-jardim")],
    ["uploadImagemImovel", () => uploadImagemImovel(new FormData())],
  ];

  test.each(acoes)("%s devolve erro de admin para corretor e não escreve", async (_nome, executar) => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "corretor-1" });
    falso.definirPapel("corretor");

    const resultado = await executar();

    expect(resultado).toEqual({ sucesso: false, erro: "Apenas administradores podem fazer isso." });
    expect(falso.chamadas.filter((c) => c.operacao && c.operacao !== "select")).toEqual([]);
    expect(falso.chamadasStorage).toEqual([]);
  });

  test.each([
    ["salvarImovel", () => salvarImovel({ ...imovelValido(), id: UUID_IMOVEL })],
    ["publicarImovel", () => publicarImovel(UUID_IMOVEL, "x")],
    ["despublicarImovel", () => despublicarImovel(UUID_IMOVEL, "x")],
    ["excluirImovel", () => excluirImovel(UUID_IMOVEL, "x")],
  ])("%s com zero linhas afetadas devolve erro, não sucesso", async (_nome, executar) => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "select", { data: { slug: "x" }, error: null });
    falso.programarResposta("imoveis", "update", { data: [], error: null });
    falso.programarResposta("imoveis", "delete", { data: [], error: null });

    const resultado = await executar();

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toMatch(/não encontrado/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test.each([
    ["publicarImovel", () => publicarImovel("abc", "x")],
    ["despublicarImovel", () => despublicarImovel("abc", "x")],
    ["excluirImovel", () => excluirImovel("abc", "x")],
    ["salvarImovel", () => salvarImovel({ ...imovelValido(), id: "abc" })],
  ])("%s com id que não é UUID é rejeitado antes de consultar", async (_nome, executar) => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await executar();

    expect(resultado).toEqual({ sucesso: false, erro: "Imóvel inválido." });
    expect(falso.chamadas.filter((c) => c.tabela === "imoveis")).toEqual([]);
  });

  test("slug alterado revalida a URL antiga e a nova", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("imoveis", "select", { data: { slug: "slug-antigo" }, error: null });
    falso.programarResposta("imoveis", "update", { data: [{ id: UUID_IMOVEL }], error: null });

    await salvarImovel({ ...imovelValido(), id: UUID_IMOVEL });

    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/slug-antigo");
    expect(revalidatePath).toHaveBeenCalledWith("/imoveis/residencial-jardim-das-palmeiras");
  });

  test("extensão do original vem do MIME, não do nome do arquivo", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = new FormData();
    fd.set("arquivo", await arquivoJpegValido("foto.php"));

    await uploadImagemImovel(fd);

    const original = falso.chamadasStorage.find(
      (c) => c.bucket === "imovel-images-originais" && c.metodo === "upload",
    );
    expect(original?.args[0]).toMatch(/^[0-9a-f-]{36}\.jpg$/);
  });
});
