"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { exigirAdmin, idSchema } from "@/lib/admin/auth";
import { slugify } from "@/lib/blog/slugify";
import { SITE_URL } from "@/lib/site";
import { urlDeLogin, type Publicacao } from "@/lib/instagram/graph";
import { graphPadrao } from "@/lib/instagram/motor-padrao";
import { automacaoSchema, type AutomacaoInput } from "@/lib/validations/instagram";
import type { AcaoResultado } from "@/app/actions/admin-parametros";

const COOKIE_STATE = "ig_oauth_state";

function revalidar() {
  revalidatePath("/admin/instagram", "layout");
}

/** Slug único: "nome", "nome-2", "nome-3"... (definido só na criação). */
async function slugLivre(supabase: Awaited<ReturnType<typeof exigirAdmin>>["supabase"], nome: string) {
  const base = slugify(nome) || "automacao";
  // Poucas automações por conta: ler todos os slugs é mais simples que filtrar por prefixo.
  const { data, error } = await supabase.from("ig_automacoes").select("slug");
  if (error) {
    console.error("[salvarAutomacao] falha ao conferir slugs:", error);
    throw error;
  }
  const usados = new Set((data ?? []).map((l: { slug: string }) => l.slug));
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function salvarAutomacao(input: AutomacaoInput): Promise<AcaoResultado & { id?: string }> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  const parsed = automacaoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  let id: string | undefined;
  if (input.id !== undefined) {
    const v = idSchema.safeParse(input.id);
    if (!v.success) return { sucesso: false, erro: "Automação inválida." };
    id = v.data;
  }

  const colunas = {
    nome: d.nome,
    alvo: d.alvo,
    midia_id: d.alvo === "especifica" ? (d.midiaId ?? null) : null,
    midia_permalink: d.alvo === "especifica" ? (d.midiaPermalink ?? null) : null,
    midia_thumb: d.alvo === "especifica" ? (d.midiaThumb ?? null) : null,
    palavras: d.palavras,
    responder_publico: d.responderPublico,
    frases_publicas: d.frasesPublicas,
    dm1_texto: d.dm1Texto,
    dm1_botao: d.dm1Botao,
    exigir_seguir: d.exigirSeguir,
    seguir_texto: d.seguirTexto,
    seguir_botao: d.seguirBotao,
    seguir_insiste_texto: d.seguirInsisteTexto,
    link_texto: d.linkTexto,
    link_botao: d.linkBotao,
    link_url: d.linkUrl,
    lembrete_ativo: d.lembreteAtivo,
    lembrete_horas: d.lembreteHoras,
    lembrete_texto: d.lembreteTexto,
    retomada_botao_texto: d.retomadaBotaoTexto,
    retomada_seguir_texto: d.retomadaSeguirTexto,
    retomada_link_texto: d.retomadaLinkTexto,
  };

  try {
    if (id) {
      // slug, criado_por e proxima_desde ficam como estão: o slug é de URL (/ir/),
      // e mexer em proxima_desde mudaria quais posts a automação já cobre.
      const { data: atual, error: erroLeitura } = await supabase
        .from("ig_automacoes")
        .select("alvo")
        .eq("id", id)
        .maybeSingle();
      if (erroLeitura) {
        console.error("[salvarAutomacao] leitura:", erroLeitura);
        return { sucesso: false, erro: "Não foi possível salvar a automação." };
      }
      if (!atual) return { sucesso: false, erro: "Automação não encontrada." };

      const atualizacao: Partial<typeof colunas> & { proxima_desde?: string } = { ...colunas };
      if (d.alvo === "proxima") {
        if ((atual as { alvo: string }).alvo !== "proxima") {
          // Virou "próxima publicação": novo vínculo a partir de agora (o check do
          // banco exige proxima_desde) e sem mídia fixa.
          atualizacao.proxima_desde = new Date().toISOString();
          atualizacao.midia_id = null;
        } else {
          // Segue "próxima": vínculo já existente, não se mexe.
          delete atualizacao.midia_id;
          delete atualizacao.midia_permalink;
          delete atualizacao.midia_thumb;
        }
      }
      const { data, error } = await supabase.from("ig_automacoes").update(atualizacao).eq("id", id).select("id");
      if (error) {
        console.error("[salvarAutomacao] update:", error);
        return { sucesso: false, erro: "Não foi possível salvar a automação." };
      }
      if (!data || data.length === 0) return { sucesso: false, erro: "Automação não encontrada." };
      revalidar();
      return { sucesso: true, id };
    }

    const slug = await slugLivre(supabase, d.nome);
    const { data, error } = await supabase
      .from("ig_automacoes")
      .insert({
        ...colunas,
        slug,
        criado_por: user.id,
        proxima_desde: d.alvo === "proxima" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[salvarAutomacao] insert:", error);
      return { sucesso: false, erro: "Não foi possível criar a automação." };
    }
    revalidar();
    return { sucesso: true, id: (data as { id: string }).id };
  } catch (e) {
    console.error("[salvarAutomacao]", e);
    return { sucesso: false, erro: "Não foi possível salvar a automação." };
  }
}

export async function alternarAutomacao(id: string, ativa: boolean): Promise<AcaoResultado> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };
  if (!idSchema.safeParse(id).success || typeof ativa !== "boolean") {
    return { sucesso: false, erro: "Automação inválida." };
  }

  const { data, error } = await supabase.from("ig_automacoes").update({ ativa }).eq("id", id).select("id");
  if (error) {
    console.error("[alternarAutomacao]", error);
    return { sucesso: false, erro: "Não foi possível alterar a automação." };
  }
  if (!data || data.length === 0) return { sucesso: false, erro: "Automação não encontrada." };
  revalidar();
  return { sucesso: true };
}

export async function excluirAutomacao(id: string): Promise<AcaoResultado> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };
  if (!idSchema.safeParse(id).success) return { sucesso: false, erro: "Automação inválida." };

  const { data, error } = await supabase.from("ig_automacoes").delete().eq("id", id).select("id");
  if (error) {
    console.error("[excluirAutomacao]", error);
    return { sucesso: false, erro: "Não foi possível excluir a automação." };
  }
  if (!data || data.length === 0) return { sucesso: false, erro: "Automação não encontrada." };
  revalidar();
  return { sucesso: true };
}

/** Apaga o contato e, em cascata, participações, mensagens, envios e cliques. */
export async function excluirContato(id: string): Promise<AcaoResultado> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };
  if (!idSchema.safeParse(id).success) return { sucesso: false, erro: "Contato inválido." };

  const { data, error } = await supabase.from("ig_contatos").delete().eq("id", id).select("id");
  if (error) {
    console.error("[excluirContato]", error);
    return { sucesso: false, erro: "Não foi possível excluir o contato." };
  }
  if (!data || data.length === 0) return { sucesso: false, erro: "Contato não encontrado." };
  revalidar();
  return { sucesso: true };
}

export async function listarPublicacoes(): Promise<AcaoResultado & { publicacoes?: Publicacao[] }> {
  const { user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  try {
    const graph = await graphPadrao();
    if (!graph) return { sucesso: false, erro: "Conecte o Instagram primeiro." };
    return { sucesso: true, publicacoes: await graph.publicacoes(24) };
  } catch (e) {
    console.error("[listarPublicacoes]", e);
    return { sucesso: false, erro: "Não foi possível carregar as publicações." };
  }
}

export async function iniciarConexao(): Promise<AcaoResultado & { url?: string }> {
  const { user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  const state = randomBytes(24).toString("hex");
  const url = urlDeLogin(state, `${SITE_URL}/api/meta/instagram/retorno/`);
  if (!url) return { sucesso: false, erro: "Configuração da Meta ausente." };

  try {
    const jar = await cookies();
    jar.set(COOKIE_STATE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  } catch (e) {
    console.error("[iniciarConexao]", e);
    return { sucesso: false, erro: "Não foi possível iniciar a conexão." };
  }
  return { sucesso: true, url };
}
