"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postFormSchema, type PostFormInput } from "@/lib/validations/post";

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
  if (!TIPOS_CAPA_PERMITIDOS.has(arquivo.type)) {
    return { sucesso: false, erro: "Formato não suportado. Use JPEG, PNG, WEBP ou GIF." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_CAPA) {
    return { sucesso: false, erro: "Imagem maior que 5MB." };
  }

  const extensao = arquivo.name.split(".").pop() ?? "jpg";
  const caminho = `${randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET_CAPAS).upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: false,
  });
  if (error) return { sucesso: false, erro: "Não foi possível enviar a imagem." };

  const { data } = supabase.storage.from(BUCKET_CAPAS).getPublicUrl(caminho);
  return { sucesso: true, url: data.publicUrl };
}
