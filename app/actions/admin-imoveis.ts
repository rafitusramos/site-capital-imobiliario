"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigirAdmin, idSchema } from "@/lib/admin/auth";
import type { createClient } from "@/lib/supabase/server";
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
const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const TIPOS_IMAGEM_PERMITIDOS = new Set(Object.keys(EXTENSAO_POR_MIME));
const ERRO_ID_INVALIDO = "Empreendimento inválido.";
const ERRO_NAO_ENCONTRADO = "Empreendimento não encontrado ou sem permissão para alterá-lo.";


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

  const extensao = EXTENSAO_POR_MIME[arquivo.type];
  const uuid = randomUUID();
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  // Original sem marca primeiro, no bucket privado: é a única rota de volta
  // para refazer o selo depois. Falhou aqui, aborta antes de sequer marcar.
  const { error: erroOriginal } = await supabase.storage
    .from(BUCKET_IMAGENS_ORIGINAIS)
    .upload(`${uuid}.${extensao}`, buffer, { contentType: arquivo.type, upsert: false });
  if (erroOriginal) {
    console.error("[enviarImagem] falha ao subir o original:", erroOriginal);
    return { erro: "Não foi possível enviar a imagem." };
  }

  let marcada: Buffer;
  try {
    marcada = await aplicarMarcaDagua(buffer);
  } catch (erro) {
    // Registrar é obrigatório, não zelo: um `catch` mudo aqui já custou uma
    // investigação inteira. Todo upload em produção falhava com a mensagem
    // genérica abaixo e NADA aparecia no log da Vercel — a causa era o selo
    // sendo lido de `public/`, que não existe no bundle da função serverless.
    console.error("[enviarImagem] falha ao aplicar marca d'água:", erro);
    // O original já subiu — fica órfão no bucket privado, lixo barato. Não
    // publicar sem marca é o que essa feature existe para garantir.
    return { erro: "Não foi possível processar a imagem." };
  }

  const caminho = `${uuid}.webp`;
  const { error } = await supabase.storage.from(BUCKET_IMAGENS).upload(caminho, marcada, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) {
    console.error("[enviarImagem] falha ao subir a imagem marcada:", error);
    return { erro: "Não foi possível enviar a imagem." };
  }

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
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  const { id, ...dados } = input;
  if (id !== undefined && !idSchema.safeParse(id).success) {
    return { sucesso: false, erro: ERRO_ID_INVALIDO };
  }
  const parsed = imovelFormSchema.safeParse(dados);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (id) {
    // Slug antigo lido ANTES do update: se mudou, a URL antiga precisa ser
    // revalidada também, senão continua servindo a página em cache.
    const { data: anterior, error: erroAnterior } = await supabase
      .from("imoveis")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (erroAnterior) {
      console.error("[salvarImovel] leitura do slug anterior:", erroAnterior);
      return { sucesso: false, erro: "Não foi possível salvar o empreendimento." };
    }
    if (!anterior) return { sucesso: false, erro: ERRO_NAO_ENCONTRADO };

    const { data: atualizados, error } = await supabase
      .from("imoveis")
      .update(parsed.data)
      .eq("id", id)
      .select("id");
    if (error) {
      console.error("[salvarImovel]", error);
      return {
        sucesso: false,
        erro:
          error.code === "23505"
            ? "Já existe um empreendimento com esse slug."
            : "Não foi possível salvar o empreendimento.",
      };
    }
    if (!atualizados || atualizados.length === 0) return { sucesso: false, erro: ERRO_NAO_ENCONTRADO };

    revalidarImoveis(parsed.data.slug);
    if (anterior.slug && anterior.slug !== parsed.data.slug) revalidarImoveis(anterior.slug);
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
    console.error("[salvarImovel] insert:", error);
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

async function alterarStatus(
  acao: string,
  id: string,
  slug: string,
  status: "ativo" | "inativo",
  erroGenerico: string,
): Promise<AcaoResultado> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };
  if (!idSchema.safeParse(id).success) return { sucesso: false, erro: ERRO_ID_INVALIDO };

  const { data, error } = await supabase.from("imoveis").update({ status }).eq("id", id).select("id");
  if (error) {
    console.error(`[${acao}]`, error);
    return { sucesso: false, erro: erroGenerico };
  }
  if (!data || data.length === 0) return { sucesso: false, erro: ERRO_NAO_ENCONTRADO };

  revalidarImoveis(slug);
  return { sucesso: true, id };
}

export async function publicarImovel(id: string, slug: string): Promise<AcaoResultado> {
  return alterarStatus("publicarImovel", id, slug, "ativo", "Não foi possível publicar o empreendimento.");
}

export async function despublicarImovel(id: string, slug: string): Promise<AcaoResultado> {
  return alterarStatus("despublicarImovel", id, slug, "inativo", "Não foi possível despublicar o empreendimento.");
}

export async function excluirImovel(id: string, slug: string): Promise<AcaoResultado> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };
  if (!idSchema.safeParse(id).success) return { sucesso: false, erro: ERRO_ID_INVALIDO };

  const { data, error } = await supabase.from("imoveis").delete().eq("id", id).select("id");
  if (error) {
    console.error("[excluirImovel]", error);
    return { sucesso: false, erro: "Não foi possível excluir o empreendimento." };
  }
  if (!data || data.length === 0) return { sucesso: false, erro: ERRO_NAO_ENCONTRADO };

  revalidarImoveis(slug);
  return { sucesso: true };
}

export async function uploadImagemImovel(formData: FormData): Promise<AcaoResultado & { url?: string }> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { sucesso: false, erro: "Selecione uma imagem." };
  }

  const resultado = await enviarImagem(supabase, arquivo);
  if (resultado.erro) return { sucesso: false, erro: resultado.erro };
  return { sucesso: true, url: resultado.url };
}

/**
 * As quatro coleções filhas (imagens, tipologias, diferenciais, FAQs) são
 * gravadas por RPC (migration 021): apaga o que saiu do array recebido do
 * editor e grava o restante — update para quem já tem `id`, insert para
 * quem não tem — tudo numa transação. Antes eram dezenas de chamadas
 * separadas, e uma falha no meio deixava a coleção pela metade.
 */

type RpcColecao =
  | "salvar_imovel_imagens"
  | "salvar_imovel_tipologias"
  | "salvar_imovel_diferenciais"
  | "salvar_imovel_faqs";

const MENSAGENS_RPC: Record<string, string> = {
  IMOVEL_NAO_ENCONTRADO: "Empreendimento não encontrado ou sem permissão para alterá-lo.",
  ITEM_NAO_ENCONTRADO: "Um dos itens não pertence a este empreendimento. Recarregue a página.",
};

async function salvarColecao(
  acao: string,
  rpc: RpcColecao,
  imovelId: string,
  slug: string,
  itens: unknown,
  schema: { safeParse: (valor: unknown) => { success: true; data: unknown } | { success: false; error: { issues: { message: string }[] } } },
  erroGenerico: string,
): Promise<AcaoResultado> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  if (!idSchema.safeParse(imovelId).success) return { sucesso: false, erro: ERRO_ID_INVALIDO };

  const parsed = schema.safeParse(itens);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase.rpc(rpc, { p_imovel_id: imovelId, p_itens: parsed.data });
  if (error) {
    console.error(`[${acao}]`, error);
    return { sucesso: false, erro: MENSAGENS_RPC[error.message?.trim()] ?? erroGenerico };
  }

  revalidarImoveis(slug);
  return { sucesso: true };
}

export async function salvarImagens(
  imovelId: string,
  slug: string,
  itens: ImagemInput[],
): Promise<AcaoResultado> {
  return salvarColecao(
    "salvarImagens",
    "salvar_imovel_imagens",
    imovelId,
    slug,
    itens,
    imagensFormSchema,
    "Não foi possível salvar as imagens.",
  );
}

export async function salvarTipologias(
  imovelId: string,
  slug: string,
  itens: TipologiaInput[],
): Promise<AcaoResultado> {
  return salvarColecao(
    "salvarTipologias",
    "salvar_imovel_tipologias",
    imovelId,
    slug,
    itens,
    tipologiasFormSchema,
    "Não foi possível salvar as tipologias.",
  );
}

export async function salvarDiferenciais(
  imovelId: string,
  slug: string,
  itens: DiferencialInput[],
): Promise<AcaoResultado> {
  return salvarColecao(
    "salvarDiferenciais",
    "salvar_imovel_diferenciais",
    imovelId,
    slug,
    itens,
    diferenciaisFormSchema,
    "Não foi possível salvar os diferenciais.",
  );
}

export async function salvarFaqs(
  imovelId: string,
  slug: string,
  itens: FaqInput[],
): Promise<AcaoResultado> {
  return salvarColecao(
    "salvarFaqs",
    "salvar_imovel_faqs",
    imovelId,
    slug,
    itens,
    faqsFormSchema,
    "Não foi possível salvar o FAQ.",
  );
}
