import { afterEach, describe, expect, test, vi } from "vitest";
import { criarSupabaseFalso } from "@/tests/apoio/supabase-falso";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  despublicarPost,
  excluirPost,
  importarMarkdown,
  publicarPost,
  salvarPost,
  uploadCapa,
  type SalvarPostInput,
} from "@/app/actions/admin-posts";

const UUID_CATEGORIA = "123e4567-e89b-12d3-a456-426614174000";
const UUID_POST = "11111111-1111-4111-8111-111111111111";
const UUID_POST_EXISTENTE = "22222222-2222-4222-8222-222222222222";
const SELECT_SLUG_ANTERIOR = { data: { slug: "slug-antigo" }, error: null };

function montarSupabase() {
  const falso = criarSupabaseFalso();
  vi.mocked(createClient).mockResolvedValue(falso.cliente as never);
  return falso;
}

// Anotado com SalvarPostInput de propósito: se o schema ganhar um campo, o
// typecheck reprova aqui em vez de o fixture silenciosamente divergir do que um
// chamador real manda (o PostEditor sempre envia todas as chaves).
function postValido(): SalvarPostInput {
  return {
    title: "Como funciona o Home Equity",
    slug: "como-funciona-o-home-equity",
    content: "Conteúdo completo do artigo.",
    category_id: UUID_CATEGORIA,
    // String vazia, não null: o helper `opcional` dos schemas aceita string,
    // "" e undefined, mas REJEITA null — embora o tipo inferido (saída do Zod)
    // declare `string | null`. O PostEditor manda "" para campo não preenchido.
    excerpt: "",
    cover_image: "",
    rotulo: "",
    cta_pagina: "",
    seo_title: "",
    seo_description: "",
  };
}

function arquivo(nome: string, conteudo: string | Uint8Array, tipo: string): File {
  return new File([conteudo], nome, { type: tipo });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("sessão expirada", () => {
  test("salvarPost sem usuário devolve erro de sessão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario(null);
    const resultado = await salvarPost(postValido());
    expect(resultado).toEqual({ sucesso: false, erro: "Sessão expirada. Faça login novamente." });
  });

  test("publicarPost sem usuário devolve erro de sessão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario(null);
    const resultado = await publicarPost(UUID_POST, "algum-slug");
    expect(resultado).toEqual({ sucesso: false, erro: "Sessão expirada. Faça login novamente." });
  });

  test("despublicarPost sem usuário devolve erro de sessão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario(null);
    const resultado = await despublicarPost(UUID_POST, "algum-slug");
    expect(resultado).toEqual({ sucesso: false, erro: "Sessão expirada. Faça login novamente." });
  });

  test("excluirPost sem usuário devolve erro de sessão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario(null);
    const resultado = await excluirPost(UUID_POST, "algum-slug");
    expect(resultado).toEqual({ sucesso: false, erro: "Sessão expirada. Faça login novamente." });
  });

  test("uploadCapa sem usuário devolve erro de sessão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario(null);
    const resultado = await uploadCapa(new FormData());
    expect(resultado).toEqual({ sucesso: false, erro: "Sessão expirada. Faça login novamente." });
  });

  test("importarMarkdown sem usuário devolve erro de sessão", async () => {
    const falso = montarSupabase();
    falso.definirUsuario(null);
    const resultado = await importarMarkdown(new FormData());
    expect(resultado).toEqual({ sucesso: false, erro: "Sessão expirada. Faça login novamente." });
  });
});

describe("salvarPost", () => {
  test("sem id, insere com author_id do usuário e devolve o id novo", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "insert", { data: { id: "post-novo" }, error: null });

    const resultado = await salvarPost(postValido());

    expect(resultado).toEqual({ sucesso: true, id: "post-novo" });
    const chamada = falso.chamadas.find((c) => c.tabela === "posts" && c.operacao === "insert");
    expect(chamada).toBeDefined();
    expect((chamada!.payload as Record<string, unknown>).author_id).toBe("user-1");
  });

  test("com id, faz update e devolve o mesmo id", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", SELECT_SLUG_ANTERIOR);
    falso.programarResposta("posts", "update", { data: [{ id: "linha-1" }], error: null });

    const resultado = await salvarPost({ ...postValido(), id: UUID_POST_EXISTENTE });

    expect(resultado).toEqual({ sucesso: true, id: UUID_POST_EXISTENTE });
    const chamada = falso.chamadas.find((c) => c.tabela === "posts" && c.operacao === "update");
    expect(chamada).toBeDefined();
  });

  test("erro 23505 no insert vira mensagem de slug duplicado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "insert", { data: null, error: { code: "23505" } });

    const resultado = await salvarPost(postValido());

    expect(resultado).toEqual({ sucesso: false, erro: "Já existe um artigo com esse slug." });
  });

  test("erro 23505 no update vira mensagem de slug duplicado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", SELECT_SLUG_ANTERIOR);
    falso.programarResposta("posts", "update", { data: null, error: { code: "23505" } });

    const resultado = await salvarPost({ ...postValido(), id: UUID_POST_EXISTENTE });

    expect(resultado).toEqual({ sucesso: false, erro: "Já existe um artigo com esse slug." });
  });

  test("outro erro no insert vira 'Não foi possível criar o artigo.'", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "insert", { data: null, error: { code: "500" } });

    const resultado = await salvarPost(postValido());

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível criar o artigo." });
  });

  test("outro erro no update vira 'Não foi possível salvar o artigo.'", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", SELECT_SLUG_ANTERIOR);
    falso.programarResposta("posts", "update", { data: null, error: { code: "500" } });

    const resultado = await salvarPost({ ...postValido(), id: UUID_POST_EXISTENTE });

    expect(resultado).toEqual({ sucesso: false, erro: "Não foi possível salvar o artigo." });
  });

  test("dados inválidos devolvem a primeira mensagem do Zod", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await salvarPost({ ...postValido(), title: "Ei" });

    expect(resultado).toEqual({ sucesso: false, erro: "Informe um título." });
  });
});

describe("publicarPost", () => {
  test("published_at já existente é preservado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", {
      data: { published_at: "2024-01-10T12:00:00.000Z" },
      error: null,
    });
    falso.programarResposta("posts", "update", { data: [{ id: "linha-1" }], error: null });

    const resultado = await publicarPost(UUID_POST, "artigo-x");

    expect(resultado).toEqual({ sucesso: true, id: UUID_POST });
    const chamada = falso.chamadas.find((c) => c.tabela === "posts" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).published_at).toBe("2024-01-10T12:00:00.000Z");
  });

  test("published_at nulo grava um ISO novo", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", { data: { published_at: null }, error: null });
    falso.programarResposta("posts", "update", { data: [{ id: "linha-1" }], error: null });

    await publicarPost(UUID_POST, "artigo-x");

    const chamada = falso.chamadas.find((c) => c.tabela === "posts" && c.operacao === "update");
    const payload = chamada!.payload as Record<string, unknown>;
    expect(payload.status).toBe("published");
    expect(typeof payload.published_at).toBe("string");
    expect(Number.isNaN(Date.parse(payload.published_at as string))).toBe(false);
  });

  test("post não encontrado devolve erro específico", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", { data: null, error: { message: "not found" } });

    const resultado = await publicarPost(UUID_POST_EXISTENTE, "artigo-x");

    expect(resultado).toEqual({ sucesso: false, erro: "Artigo não encontrado." });
  });

  test("sucesso revalida /blog, /blog/<slug> e /sitemap.xml", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", { data: { published_at: null }, error: null });
    falso.programarResposta("posts", "update", { data: [{ id: "linha-1" }], error: null });

    await publicarPost(UUID_POST, "artigo-x");

    expect(revalidatePath).toHaveBeenCalledWith("/blog");
    expect(revalidatePath).toHaveBeenCalledWith("/blog/artigo-x");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});

describe("despublicarPost", () => {
  test("grava status draft e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "update", { data: [{ id: "linha-1" }], error: null });

    const resultado = await despublicarPost(UUID_POST, "artigo-x");

    expect(resultado).toEqual({ sucesso: true, id: UUID_POST });
    const chamada = falso.chamadas.find((c) => c.tabela === "posts" && c.operacao === "update");
    expect((chamada!.payload as Record<string, unknown>).status).toBe("draft");
    expect(revalidatePath).toHaveBeenCalledWith("/blog/artigo-x");
  });
});

describe("excluirPost", () => {
  test("deleta e revalida", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "delete", { data: [{ id: "linha-1" }], error: null });

    const resultado = await excluirPost(UUID_POST, "artigo-x");

    expect(resultado).toEqual({ sucesso: true });
    const chamada = falso.chamadas.find((c) => c.tabela === "posts" && c.operacao === "delete");
    expect(chamada).toBeDefined();
    expect(revalidatePath).toHaveBeenCalledWith("/blog/artigo-x");
  });
});

describe("uploadCapa", () => {
  test("sem arquivo devolve 'Selecione uma imagem.'", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await uploadCapa(new FormData());

    expect(resultado).toEqual({ sucesso: false, erro: "Selecione uma imagem." });
  });

  test("tipo não suportado devolve mensagem de formato", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = new FormData();
    fd.set("arquivo", arquivo("capa.txt", "conteudo", "text/plain"));

    const resultado = await uploadCapa(fd);

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
    fd.set("arquivo", arquivo("capa.jpg", grande, "image/jpeg"));

    const resultado = await uploadCapa(fd);

    expect(resultado).toEqual({ sucesso: false, erro: "Imagem maior que 5MB." });
  });

  test("sucesso devolve a publicUrl", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarUpload("blog-images", { data: { path: "abc.jpg" }, error: null });
    falso.programarPublicUrl("blog-images", "https://cdn.example.com/blog-images/abc.jpg");
    const fd = new FormData();
    fd.set("arquivo", arquivo("capa.jpg", "conteudo", "image/jpeg"));

    const resultado = await uploadCapa(fd);

    expect(resultado).toEqual({
      sucesso: true,
      url: "https://cdn.example.com/blog-images/abc.jpg",
    });
  });
});

describe("importarMarkdown", () => {
  function markdown(campos: Record<string, string>, corpo: string) {
    const linhas = Object.entries(campos).map(([chave, valor]) => `${chave}: "${valor}"`);
    return ["---", ...linhas, "---", corpo].join("\n");
  }

  function formDataComMd(conteudo: string) {
    const fd = new FormData();
    fd.set("arquivo_md", arquivo("artigo.md", conteudo, "text/markdown"));
    return fd;
  }

  test("sem arquivo .md devolve erro", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    const resultado = await importarMarkdown(new FormData());

    expect(resultado).toEqual({ sucesso: false, erro: "Selecione o arquivo .md do artigo." });
  });

  test("frontmatter inválido propaga a mensagem do parser", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = formDataComMd("sem frontmatter nenhum aqui");

    const resultado = await importarMarkdown(fd);

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Frontmatter ausente: o arquivo precisa começar com "---".',
    });
  });

  test("sem titulo no frontmatter devolve mensagem específica", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = formDataComMd(markdown({ categoria: "Financiamento" }, "Conteúdo do artigo."));

    const resultado = await importarMarkdown(fd);

    expect(resultado).toEqual({ sucesso: false, erro: 'Frontmatter sem "titulo".' });
  });

  test("corpo vazio devolve mensagem específica", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = formDataComMd(
      markdown({ titulo: "Título válido", categoria: "Financiamento" }, "   "),
    );

    const resultado = await importarMarkdown(fd);

    expect(resultado).toEqual({ sucesso: false, erro: "O artigo está sem conteúdo." });
  });

  test("categoria não reconhecida devolve mensagem de categoria", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = formDataComMd(
      markdown({ titulo: "Título válido", categoria: "Categoria Inexistente" }, "Corpo do artigo."),
    );

    const resultado = await importarMarkdown(fd);

    expect(resultado).toEqual({
      sucesso: false,
      erro: "Categoria não reconhecida. Use: Financiamento, Home Equity, Consórcio ou Imóveis.",
    });
  });

  test.each([
    ["Home Equity", "home-equity"],
    ["home equity", "home-equity"],
    ["consórcio", "consorcio"],
    ["consorcio", "consorcio"],
    ["imóveis", "imoveis"],
    ["imoveis", "imoveis"],
  ])("apelido de categoria '%s' mapeia para o slug '%s'", async (apelido, slugEsperado) => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    // Categoria não encontrada no banco de propósito — o que importa aqui é
    // conferir qual slug foi consultado, não o desfecho da importação.
    falso.programarResposta("categories", "select", { data: null, error: null });
    const fd = formDataComMd(markdown({ titulo: "Título válido", categoria: apelido }, "Corpo."));

    await importarMarkdown(fd);

    const chamada = falso.chamadas.find((c) => c.tabela === "categories");
    expect(chamada).toBeDefined();
    const filtroEq = chamada!.filtros.find((f) => f.metodo === "eq");
    expect(filtroEq?.args).toEqual(["slug", slugEsperado]);
  });

  test("categoria não encontrada no banco devolve mensagem específica", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("categories", "select", { data: null, error: null });
    const fd = formDataComMd(
      markdown({ titulo: "Título válido", categoria: "Financiamento" }, "Corpo do artigo."),
    );

    const resultado = await importarMarkdown(fd);

    expect(resultado).toEqual({ sucesso: false, erro: "Categoria não encontrada no banco." });
  });

  test("sucesso insere com slug derivado do título e campos do frontmatter mapeados", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("categories", "select", { data: { id: UUID_CATEGORIA }, error: null });
    falso.programarResposta("posts", "insert", { data: { id: "post-importado" }, error: null });

    const conteudo = markdown(
      {
        titulo: "Como Funciona o Home Equity",
        categoria: "Home Equity",
        resumo: "Resumo curto do artigo.",
        seo_titulo: "Home Equity — SEO",
        seo_descricao: "Descrição SEO do artigo.",
      },
      "Conteúdo completo do artigo aqui.",
    );
    const fd = formDataComMd(conteudo);

    const resultado = await importarMarkdown(fd);

    expect(resultado).toEqual({ sucesso: true, id: "post-importado" });
    const chamada = falso.chamadas.find((c) => c.tabela === "posts" && c.operacao === "insert");
    const payload = chamada!.payload as Record<string, unknown>;
    expect(payload.slug).toBe("como-funciona-o-home-equity");
    expect(payload.title).toBe("Como Funciona o Home Equity");
    expect(payload.excerpt).toBe("Resumo curto do artigo.");
    expect(payload.seo_title).toBe("Home Equity — SEO");
    expect(payload.seo_description).toBe("Descrição SEO do artigo.");
    expect(payload.cover_image).toBeNull();
    expect(payload.category_id).toBe(UUID_CATEGORIA);
    expect(payload.author_id).toBe("user-1");
  });
});

describe("permissão de administrador", () => {
  const acoes: [string, () => Promise<{ sucesso: boolean; erro?: string }>][] = [
    ["salvarPost", () => salvarPost(postValido())],
    ["salvarPost (update)", () => salvarPost({ ...postValido(), id: UUID_POST })],
    ["publicarPost", () => publicarPost(UUID_POST, "artigo-x")],
    ["despublicarPost", () => despublicarPost(UUID_POST, "artigo-x")],
    ["excluirPost", () => excluirPost(UUID_POST, "artigo-x")],
    ["uploadCapa", () => uploadCapa(new FormData())],
    ["importarMarkdown", () => importarMarkdown(new FormData())],
  ];

  test.each(acoes)("%s devolve erro de admin para corretor e não escreve", async (_nome, executar) => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "corretor-1" });
    falso.definirPapel("corretor");

    const resultado = await executar();

    expect(resultado).toEqual({ sucesso: false, erro: "Apenas administradores podem fazer isso." });
    const escritas = falso.chamadas.filter((c) => c.operacao && c.operacao !== "select");
    expect(escritas).toEqual([]);
    expect(falso.chamadasStorage).toEqual([]);
  });

  test("perfil inexistente também é barrado", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "sem-perfil" });
    falso.definirPapel(null);

    const resultado = await excluirPost(UUID_POST, "artigo-x");

    expect(resultado).toEqual({ sucesso: false, erro: "Apenas administradores podem fazer isso." });
  });
});

describe("integridade", () => {
  test("id que não é UUID é rejeitado antes de qualquer consulta", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });

    for (const resultado of [
      await publicarPost("1; drop table posts", "x"),
      await despublicarPost("abc", "x"),
      await excluirPost("abc", "x"),
      await salvarPost({ ...postValido(), id: "abc" }),
    ]) {
      expect(resultado).toEqual({ sucesso: false, erro: "Artigo inválido." });
    }
    expect(falso.chamadas.filter((c) => c.tabela === "posts")).toEqual([]);
  });

  test.each([
    ["salvarPost", () => salvarPost({ ...postValido(), id: UUID_POST })],
    ["publicarPost", () => publicarPost(UUID_POST, "x")],
    ["despublicarPost", () => despublicarPost(UUID_POST, "x")],
    ["excluirPost", () => excluirPost(UUID_POST, "x")],
  ])("%s com zero linhas afetadas devolve erro, não sucesso", async (_nome, executar) => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", { data: { slug: "x", published_at: null }, error: null });
    falso.programarResposta("posts", "update", { data: [], error: null });
    falso.programarResposta("posts", "delete", { data: [], error: null });

    const resultado = await executar();

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toMatch(/não encontrado/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("salvarPost com slug alterado revalida o slug novo e o antigo", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("posts", "select", SELECT_SLUG_ANTERIOR);
    falso.programarResposta("posts", "update", { data: [{ id: UUID_POST }], error: null });

    await salvarPost({ ...postValido(), id: UUID_POST });

    expect(revalidatePath).toHaveBeenCalledWith("/blog/como-funciona-o-home-equity");
    expect(revalidatePath).toHaveBeenCalledWith("/blog/slug-antigo");
    expect(revalidatePath).toHaveBeenCalledWith("/blog");
  });

  test("capa usa extensão derivada do MIME, não do nome do arquivo", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    const fd = new FormData();
    fd.set("arquivo", arquivo("capa.php", "conteudo", "image/png"));

    await uploadCapa(fd);

    const envio = falso.chamadasStorage.find((c) => c.metodo === "upload");
    expect(envio?.args[0]).toMatch(/^[0-9a-f-]{36}\.png$/);
  });

  test("importarMarkdown com frontmatter que reprova no schema não insere nem sobe capa", async () => {
    const falso = montarSupabase();
    falso.definirUsuario({ id: "user-1" });
    falso.programarResposta("categories", "select", { data: { id: UUID_CATEGORIA }, error: null });
    const md = ["---", 'titulo: "Ab"', 'categoria: "Financiamento"', "---", "Corpo."].join("\n");
    const fd = new FormData();
    fd.set("arquivo_md", arquivo("artigo.md", md, "text/markdown"));
    fd.set("arquivo_capa", arquivo("capa.jpg", "x", "image/jpeg"));

    const resultado = await importarMarkdown(fd);

    expect(resultado).toEqual({ sucesso: false, erro: "Informe um título." });
    expect(falso.chamadas.some((c) => c.operacao === "insert")).toBe(false);
    expect(falso.chamadasStorage).toEqual([]);
  });
});
