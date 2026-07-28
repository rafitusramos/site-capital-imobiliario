"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postFormSchema, type PostFormInput } from "@/lib/validations/post";
import { parseFrontmatter } from "@/lib/blog/frontmatter";
import { slugify } from "@/lib/blog/slugify";

export interface SalvarPostInput extends PostFormInput {
  id?: string;
}

export interface AcaoResultado {
  sucesso: boolean;
  erro?: string;
  id?: string;
}

const BUCKET_CAPAS = "blog-images";
const TAMANHO_MAXIMO_CAPA = 5 * 1024 * 1024;
const TIPOS_CAPA_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function usuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function enviarImagem(
  supabase: SupabaseServerClient,
  arquivo: File,
): Promise<{ url?: string; erro?: string }> {
  if (!TIPOS_CAPA_PERMITIDOS.has(arquivo.type)) {
    return { erro: "Formato não suportado. Use JPEG, PNG, WEBP ou GIF." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_CAPA) {
    return { erro: "Imagem maior que 5MB." };
  }

  const extensao = arquivo.name.split(".").pop() ?? "jpg";
  const caminho = `${randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET_CAPAS).upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: false,
  });
  if (error) return { erro: "Não foi possível enviar a imagem." };

  const { data } = supabase.storage.from(BUCKET_CAPAS).getPublicUrl(caminho);
  return { url: data.publicUrl };
}

function revalidarBlog(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

/** Cria ou atualiza um post (sem mexer em status/published_at). */
export async function salvarPost(input: SalvarPostInput): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { id, ...dados } = input;
  const parsed = postFormSchema.safeParse(dados);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (id) {
    const { error } = await supabase.from("posts").update(parsed.data).eq("id", id);
    if (error) {
      return {
        sucesso: false,
        erro: error.code === "23505" ? "Já existe um artigo com esse slug." : "Não foi possível salvar o artigo.",
      };
    }
    return { sucesso: true, id };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ ...parsed.data, author_id: user.id })
    .select("id")
    .single();

  if (error) {
    return {
      sucesso: false,
      erro: error.code === "23505" ? "Já existe um artigo com esse slug." : "Não foi possível criar o artigo.",
    };
  }

  return { sucesso: true, id: data.id };
}

export async function publicarPost(id: string, slug: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { data: atual, error: erroAtual } = await supabase
    .from("posts")
    .select("published_at")
    .eq("id", id)
    .single();
  if (erroAtual) return { sucesso: false, erro: "Artigo não encontrado." };

  const { error } = await supabase
    .from("posts")
    .update({ status: "published", published_at: atual.published_at ?? new Date().toISOString() })
    .eq("id", id);
  if (error) return { sucesso: false, erro: "Não foi possível publicar o artigo." };

  revalidarBlog(slug);
  return { sucesso: true, id };
}

export async function despublicarPost(id: string, slug: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("posts").update({ status: "draft" }).eq("id", id);
  if (error) return { sucesso: false, erro: "Não foi possível despublicar o artigo." };

  revalidarBlog(slug);
  return { sucesso: true, id };
}

export async function excluirPost(id: string, slug: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { sucesso: false, erro: "Não foi possível excluir o artigo." };

  revalidarBlog(slug);
  return { sucesso: true };
}

export async function uploadCapa(formData: FormData): Promise<AcaoResultado & { url?: string }> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { sucesso: false, erro: "Selecione uma imagem." };
  }

  const resultado = await enviarImagem(supabase, arquivo);
  if (resultado.erro) return { sucesso: false, erro: resultado.erro };
  return { sucesso: true, url: resultado.url };
}

const CATEGORIA_POR_APELIDO: Record<string, string> = {
  financiamento: "financiamento",
  "home-equity": "home-equity",
  "home equity": "home-equity",
  consorcio: "consorcio",
  "consórcio": "consorcio",
  imoveis: "imoveis",
  "imóveis": "imoveis",
};

/** Cria um post em rascunho a partir de um .md (docs/modelo-artigo.md) + capa opcional. */
export async function importarMarkdown(formData: FormData): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const arquivoMd = formData.get("arquivo_md");
  if (!(arquivoMd instanceof File) || arquivoMd.size === 0) {
    return { sucesso: false, erro: "Selecione o arquivo .md do artigo." };
  }

  let dados: Record<string, string>;
  let corpo: string;
  try {
    const texto = await arquivoMd.text();
    ({ dados, corpo } = parseFrontmatter(texto));
  } catch (e) {
    return { sucesso: false, erro: e instanceof Error ? e.message : "Não foi possível ler o arquivo." };
  }

  const titulo = dados.titulo?.trim();
  if (!titulo) return { sucesso: false, erro: 'Frontmatter sem "titulo".' };
  if (!corpo.trim()) return { sucesso: false, erro: "O artigo está sem conteúdo." };

  const apelidoCategoria = (dados.categoria ?? "").trim().toLowerCase();
  const slugCategoria = CATEGORIA_POR_APELIDO[apelidoCategoria];
  if (!slugCategoria) {
    return {
      sucesso: false,
      erro: 'Categoria não reconhecida. Use: Financiamento, Home Equity, Consórcio ou Imóveis.',
    };
  }

  const { data: categoria, error: erroCategoria } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slugCategoria)
    .single();
  if (erroCategoria || !categoria) {
    return { sucesso: false, erro: "Categoria não encontrada no banco." };
  }

  let capaUrl: string | null = null;
  const arquivoCapa = formData.get("arquivo_capa");
  if (arquivoCapa instanceof File && arquivoCapa.size > 0) {
    const resultadoCapa = await enviarImagem(supabase, arquivoCapa);
    if (resultadoCapa.erro) return { sucesso: false, erro: resultadoCapa.erro };
    capaUrl = resultadoCapa.url ?? null;
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title: titulo,
      slug: slugify(titulo),
      excerpt: dados.resumo || null,
      content: corpo,
      cover_image: capaUrl,
      category_id: categoria.id,
      rotulo: dados.rotulo || null,
      cta_pagina: dados.cta_pagina || null,
      seo_title: dados.seo_titulo || null,
      seo_description: dados.seo_descricao || null,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      sucesso: false,
      erro: error.code === "23505" ? "Já existe um artigo com um título/slug igual." : "Não foi possível importar o artigo.",
    };
  }

  return { sucesso: true, id: post.id };
}
