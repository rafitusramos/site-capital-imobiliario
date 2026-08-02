"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aplicarMarcaDagua } from "@/lib/imoveis/marca-dagua";
import {
  imovelFormSchema,
  type ImovelFormInput,
  imagensFormSchema,
  type ImagemInput,
  tipologiasFormSchema,
  type TipologiaInput,
  diferenciaisFormSchema,
  type DiferencialInput,
  faqsFormSchema,
  type FaqInput,
} from "@/lib/validations/imovel";

export interface SalvarImovelInput extends ImovelFormInput {
  id?: string;
}

export interface AcaoResultado {
  sucesso: boolean;
  erro?: string;
  id?: string;
}

const BUCKET_IMAGENS = "imovel-images";
// Original sem marca, bucket privado (migration 019) — existe só para
// permitir refazer o selo depois; ninguém lê daqui pela LP.
const BUCKET_IMAGENS_ORIGINAIS = "imovel-images-originais";
const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
const TIPOS_IMAGEM_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
  if (!TIPOS_IMAGEM_PERMITIDOS.has(arquivo.type)) {
    return { erro: "Formato não suportado. Use JPEG, PNG, WEBP ou GIF." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    return { erro: "Imagem maior que 5MB." };
  }

  const extensao = arquivo.name.split(".").pop() ?? "jpg";
  const uuid = randomUUID();
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  // Original sem marca primeiro, no bucket privado: é a única rota de volta
  // para refazer o selo depois. Falhou aqui, aborta antes de sequer marcar.
  const { error: erroOriginal } = await supabase.storage
    .from(BUCKET_IMAGENS_ORIGINAIS)
    .upload(`${uuid}.${extensao}`, buffer, { contentType: arquivo.type, upsert: false });
  if (erroOriginal) return { erro: "Não foi possível enviar a imagem." };

  let marcada: Buffer;
  try {
    marcada = await aplicarMarcaDagua(buffer);
  } catch {
    // O original já subiu — fica órfão no bucket privado, lixo barato. Não
    // publicar sem marca é o que essa feature existe para garantir.
    return { erro: "Não foi possível processar a imagem." };
  }

  const caminho = `${uuid}.webp`;
  const { error } = await supabase.storage.from(BUCKET_IMAGENS).upload(caminho, marcada, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) return { erro: "Não foi possível enviar a imagem." };

  const { data } = supabase.storage.from(BUCKET_IMAGENS).getPublicUrl(caminho);
  return { url: data.publicUrl };
}

function revalidarImoveis(slug: string) {
  revalidatePath("/imoveis");
  revalidatePath(`/imoveis/${slug}`);
  revalidatePath("/sitemap.xml");
}

/** Cria ou atualiza os dados gerais de um empreendimento (nunca mexe em `status`). */
export async function salvarImovel(input: SalvarImovelInput): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { id, ...dados } = input;
  const parsed = imovelFormSchema.safeParse(dados);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (id) {
    const { error } = await supabase.from("imoveis").update(parsed.data).eq("id", id);
    if (error) {
      return {
        sucesso: false,
        erro:
          error.code === "23505"
            ? "Já existe um empreendimento com esse slug."
            : "Não foi possível salvar o empreendimento.",
      };
    }
    revalidarImoveis(parsed.data.slug);
    return { sucesso: true, id };
  }

  // O default da coluna `status` é 'ativo' — sem forçar 'inativo' aqui,
  // todo empreendimento novo nasceria publicado.
  const { data, error } = await supabase
    .from("imoveis")
    .insert({ ...parsed.data, status: "inativo" })
    .select("id")
    .single();

  if (error) {
    return {
      sucesso: false,
      erro:
        error.code === "23505"
          ? "Já existe um empreendimento com esse slug."
          : "Não foi possível criar o empreendimento.",
    };
  }

  return { sucesso: true, id: data.id };
}

export async function publicarImovel(id: string, slug: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("imoveis").update({ status: "ativo" }).eq("id", id);
  if (error) return { sucesso: false, erro: "Não foi possível publicar o empreendimento." };

  revalidarImoveis(slug);
  return { sucesso: true, id };
}

export async function despublicarImovel(id: string, slug: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("imoveis").update({ status: "inativo" }).eq("id", id);
  if (error) return { sucesso: false, erro: "Não foi possível despublicar o empreendimento." };

  revalidarImoveis(slug);
  return { sucesso: true, id };
}

export async function excluirImovel(id: string, slug: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("imoveis").delete().eq("id", id);
  if (error) return { sucesso: false, erro: "Não foi possível excluir o empreendimento." };

  revalidarImoveis(slug);
  return { sucesso: true };
}

export async function uploadImagemImovel(formData: FormData): Promise<AcaoResultado & { url?: string }> {
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

/**
 * As quatro funções abaixo reconciliam uma coleção filha inteira num único
 * round-trip lógico: apagam o que saiu do array recebido do editor e
 * gravam o restante — update para quem já tem `id`, insert para quem não
 * tem (deixando o banco gerar o id e manter a `ordem` enviada pelo form).
 * Evita `upsert` em lote porque colunas ausentes num item sem `id` seriam
 * enviadas como NULL pelo postgrest-js, o que colide com a PK gerada por
 * default.
 */

export async function salvarImagens(
  imovelId: string,
  slug: string,
  itens: ImagemInput[],
): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = imagensFormSchema.safeParse(itens);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data: existentes, error: erroExistentes } = await supabase
    .from("imovel_imagens")
    .select("id")
    .eq("imovel_id", imovelId);
  if (erroExistentes) return { sucesso: false, erro: "Não foi possível ler as imagens existentes." };

  const idsAtuais = new Set(parsed.data.filter((item) => item.id).map((item) => item.id as string));
  const idsParaRemover = (existentes ?? []).map((e) => e.id).filter((id) => !idsAtuais.has(id));

  if (idsParaRemover.length > 0) {
    const { error } = await supabase.from("imovel_imagens").delete().in("id", idsParaRemover);
    if (error) return { sucesso: false, erro: "Não foi possível remover as imagens excluídas." };
  }

  for (const item of parsed.data) {
    const { id, ...campos } = item;
    if (id) {
      const { error } = await supabase.from("imovel_imagens").update(campos).eq("id", id);
      if (error) return { sucesso: false, erro: "Não foi possível salvar as imagens." };
    } else {
      const { error } = await supabase.from("imovel_imagens").insert({ ...campos, imovel_id: imovelId });
      if (error) return { sucesso: false, erro: "Não foi possível salvar as imagens." };
    }
  }

  revalidarImoveis(slug);
  return { sucesso: true };
}

export async function salvarTipologias(
  imovelId: string,
  slug: string,
  itens: TipologiaInput[],
): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = tipologiasFormSchema.safeParse(itens);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data: existentes, error: erroExistentes } = await supabase
    .from("imovel_tipologias")
    .select("id")
    .eq("imovel_id", imovelId);
  if (erroExistentes) return { sucesso: false, erro: "Não foi possível ler as tipologias existentes." };

  const idsAtuais = new Set(parsed.data.filter((item) => item.id).map((item) => item.id as string));
  const idsParaRemover = (existentes ?? []).map((e) => e.id).filter((id) => !idsAtuais.has(id));

  if (idsParaRemover.length > 0) {
    const { error } = await supabase.from("imovel_tipologias").delete().in("id", idsParaRemover);
    if (error) return { sucesso: false, erro: "Não foi possível remover as tipologias excluídas." };
  }

  for (const item of parsed.data) {
    const { id, ...campos } = item;
    if (id) {
      const { error } = await supabase.from("imovel_tipologias").update(campos).eq("id", id);
      if (error) return { sucesso: false, erro: "Não foi possível salvar as tipologias." };
    } else {
      const { error } = await supabase.from("imovel_tipologias").insert({ ...campos, imovel_id: imovelId });
      if (error) return { sucesso: false, erro: "Não foi possível salvar as tipologias." };
    }
  }

  revalidarImoveis(slug);
  return { sucesso: true };
}

export async function salvarDiferenciais(
  imovelId: string,
  slug: string,
  itens: DiferencialInput[],
): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = diferenciaisFormSchema.safeParse(itens);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data: existentes, error: erroExistentes } = await supabase
    .from("imovel_diferenciais")
    .select("id")
    .eq("imovel_id", imovelId);
  if (erroExistentes) return { sucesso: false, erro: "Não foi possível ler os diferenciais existentes." };

  const idsAtuais = new Set(parsed.data.filter((item) => item.id).map((item) => item.id as string));
  const idsParaRemover = (existentes ?? []).map((e) => e.id).filter((id) => !idsAtuais.has(id));

  if (idsParaRemover.length > 0) {
    const { error } = await supabase.from("imovel_diferenciais").delete().in("id", idsParaRemover);
    if (error) return { sucesso: false, erro: "Não foi possível remover os diferenciais excluídos." };
  }

  for (const item of parsed.data) {
    const { id, ...campos } = item;
    if (id) {
      const { error } = await supabase.from("imovel_diferenciais").update(campos).eq("id", id);
      if (error) return { sucesso: false, erro: "Não foi possível salvar os diferenciais." };
    } else {
      const { error } = await supabase.from("imovel_diferenciais").insert({ ...campos, imovel_id: imovelId });
      if (error) return { sucesso: false, erro: "Não foi possível salvar os diferenciais." };
    }
  }

  revalidarImoveis(slug);
  return { sucesso: true };
}

export async function salvarFaqs(
  imovelId: string,
  slug: string,
  itens: FaqInput[],
): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = faqsFormSchema.safeParse(itens);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data: existentes, error: erroExistentes } = await supabase
    .from("imovel_faqs")
    .select("id")
    .eq("imovel_id", imovelId);
  if (erroExistentes) return { sucesso: false, erro: "Não foi possível ler o FAQ existente." };

  const idsAtuais = new Set(parsed.data.filter((item) => item.id).map((item) => item.id as string));
  const idsParaRemover = (existentes ?? []).map((e) => e.id).filter((id) => !idsAtuais.has(id));

  if (idsParaRemover.length > 0) {
    const { error } = await supabase.from("imovel_faqs").delete().in("id", idsParaRemover);
    if (error) return { sucesso: false, erro: "Não foi possível remover as perguntas excluídas." };
  }

  for (const item of parsed.data) {
    const { id, ...campos } = item;
    if (id) {
      const { error } = await supabase.from("imovel_faqs").update(campos).eq("id", id);
      if (error) return { sucesso: false, erro: "Não foi possível salvar o FAQ." };
    } else {
      const { error } = await supabase.from("imovel_faqs").insert({ ...campos, imovel_id: imovelId });
      if (error) return { sucesso: false, erro: "Não foi possível salvar o FAQ." };
    }
  }

  revalidarImoveis(slug);
  return { sucesso: true };
}
