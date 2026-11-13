import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Automacao, Alvo, Situacao } from "@/lib/instagram/tipos";

// Leituras do painel /admin/instagram. Cliente de cookies: a RLS (só admin)
// vale. Nunca lançam: falha vira console.error e resultado vazio/nulo.

type LinhaAutomacao = {
  id: string;
  nome: string;
  slug: string;
  ativa: boolean;
  alvo: string;
  midia_id: string | null;
  midia_permalink: string | null;
  midia_thumb: string | null;
  proxima_desde: string | null;
  palavras: string[] | null;
  responder_publico: boolean;
  frases_publicas: string[] | null;
  dm1_texto: string;
  dm1_botao: string;
  exigir_seguir: boolean;
  seguir_texto: string;
  seguir_botao: string;
  seguir_insiste_texto: string;
  link_texto: string;
  link_botao: string;
  link_url: string;
  lembrete_ativo: boolean;
  lembrete_horas: number;
  lembrete_texto: string;
  retomada_botao_texto: string;
  retomada_seguir_texto: string;
  retomada_link_texto: string;
  criado_em: string;
};

export type AutomacaoPainel = Automacao & {
  midiaPermalink: string | null;
  midiaThumb: string | null;
};

function mapearAutomacao(l: LinhaAutomacao): AutomacaoPainel {
  return {
    id: l.id,
    nome: l.nome,
    slug: l.slug,
    ativa: l.ativa,
    alvo: l.alvo as Alvo,
    midiaId: l.midia_id,
    midiaPermalink: l.midia_permalink,
    midiaThumb: l.midia_thumb,
    proximaDesde: l.proxima_desde,
    palavras: l.palavras,
    responderPublico: l.responder_publico,
    frasesPublicas: l.frases_publicas ?? [],
    dm1Texto: l.dm1_texto,
    dm1Botao: l.dm1_botao,
    exigirSeguir: l.exigir_seguir,
    seguirTexto: l.seguir_texto,
    seguirBotao: l.seguir_botao,
    seguirInsisteTexto: l.seguir_insiste_texto,
    linkTexto: l.link_texto,
    linkBotao: l.link_botao,
    linkUrl: l.link_url,
    lembreteAtivo: l.lembrete_ativo,
    lembreteHoras: l.lembrete_horas,
    lembreteTexto: l.lembrete_texto,
    retomadaBotaoTexto: l.retomada_botao_texto,
    retomadaSeguirTexto: l.retomada_seguir_texto,
    retomadaLinkTexto: l.retomada_link_texto,
    criadoEm: l.criado_em,
  };
}

const COLUNAS_AUTOMACAO =
  "id,nome,slug,ativa,alvo,midia_id,midia_permalink,midia_thumb,proxima_desde,palavras,responder_publico,frases_publicas,dm1_texto,dm1_botao,exigir_seguir,seguir_texto,seguir_botao,seguir_insiste_texto,link_texto,link_botao,link_url,lembrete_ativo,lembrete_horas,lembrete_texto,retomada_botao_texto,retomada_seguir_texto,retomada_link_texto,criado_em";

export async function listarAutomacoes(): Promise<AutomacaoPainel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ig_automacoes")
    .select(COLUNAS_AUTOMACAO)
    .order("criado_em", { ascending: false });
  if (error) {
    console.error("[listarAutomacoes]", error);
    return [];
  }
  return ((data ?? []) as unknown as LinhaAutomacao[]).map(mapearAutomacao);
}

export async function automacaoPorId(id: string): Promise<AutomacaoPainel | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ig_automacoes")
    .select(COLUNAS_AUTOMACAO)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[automacaoPorId]", error);
    return null;
  }
  return data ? mapearAutomacao(data as unknown as LinhaAutomacao) : null;
}

// ---------------------------------------------------------------------------
// Caixa de entrada
// ---------------------------------------------------------------------------

export type FiltroCaixa = {
  automacaoId?: string;
  situacao?: Situacao | "falha" | "3mais";
};

export type ItemCaixa = {
  participacaoId: string;
  contato: { id: string; username: string | null; nome: string | null; fotoUrl: string | null };
  automacaoId: string;
  automacaoNome: string;
  situacao: Situacao;
  comentarios: number;
  falhaMotivo: string | null;
  /** ISO do lembrete pendente (menor enviar_apos), ou null. */
  lembreteEm: string | null;
  /** ISO da última atualização da participação. */
  atualizadoEm: string;
};

type LinhaCaixa = {
  id: string;
  contato_id: string;
  automacao_id: string;
  situacao: string;
  comentarios: number;
  falha_motivo: string | null;
  atualizado_em: string;
  ig_contatos: { id: string; username: string | null; nome: string | null; foto_url: string | null } | null;
  ig_automacoes: { nome: string } | null;
};

/**
 * Um item por contato, com a participação mais recente (atualizado_em).
 * O filtro vale sobre as participações; o contato aparece pela mais recente
 * que o satisfaz.
 */
export async function caixaDeEntrada(filtro: FiltroCaixa = {}): Promise<ItemCaixa[]> {
  const supabase = await createClient();
  let q = supabase
    .from("ig_participacoes")
    .select(
      "id,contato_id,automacao_id,situacao,comentarios,falha_motivo,atualizado_em,ig_contatos(id,username,nome,foto_url),ig_automacoes(nome)",
    )
    .order("atualizado_em", { ascending: false })
    .limit(500);

  if (filtro.automacaoId) q = q.eq("automacao_id", filtro.automacaoId);
  if (filtro.situacao === "falha") q = q.not("falha_motivo", "is", null);
  else if (filtro.situacao === "3mais") q = q.gte("comentarios", 3);
  else if (filtro.situacao) q = q.eq("situacao", filtro.situacao);

  const { data, error } = await q;
  if (error) {
    console.error("[caixaDeEntrada]", error);
    return [];
  }

  // Ordenado do mais recente: a primeira participação de cada contato vence.
  const porContato = new Map<string, LinhaCaixa>();
  for (const l of (data ?? []) as unknown as LinhaCaixa[]) {
    if (!porContato.has(l.contato_id)) porContato.set(l.contato_id, l);
  }
  const linhas = [...porContato.values()];
  if (linhas.length === 0) return [];

  const lembretes = new Map<string, string>();
  const { data: envios, error: erroEnvios } = await supabase
    .from("ig_envios")
    .select("participacao_id,enviar_apos")
    .eq("tipo", "lembrete")
    .eq("estado", "pendente")
    .in(
      "participacao_id",
      linhas.map((l) => l.id),
    );
  if (erroEnvios) {
    console.error("[caixaDeEntrada] lembretes:", erroEnvios);
  } else {
    for (const e of (envios ?? []) as { participacao_id: string; enviar_apos: string }[]) {
      const atual = lembretes.get(e.participacao_id);
      if (!atual || new Date(e.enviar_apos) < new Date(atual)) lembretes.set(e.participacao_id, e.enviar_apos);
    }
  }

  return linhas.map((l) => ({
    participacaoId: l.id,
    contato: {
      id: l.contato_id,
      username: l.ig_contatos?.username ?? null,
      nome: l.ig_contatos?.nome ?? null,
      fotoUrl: l.ig_contatos?.foto_url ?? null,
    },
    automacaoId: l.automacao_id,
    automacaoNome: l.ig_automacoes?.nome ?? "",
    situacao: l.situacao as Situacao,
    comentarios: l.comentarios,
    falhaMotivo: l.falha_motivo,
    lembreteEm: lembretes.get(l.id) ?? null,
    atualizadoEm: l.atualizado_em,
  }));
}

// ---------------------------------------------------------------------------
// Conversa, resumo, conexão
// ---------------------------------------------------------------------------

export type MensagemConversa = {
  id: string;
  direcao: "entrada" | "saida" | "dono" | "sistema";
  tipo: "comentario" | "texto" | "botao" | "link_aberto" | "resposta_publica" | "aviso";
  texto: string | null;
  criadoEm: string;
};

export async function conversa(contatoId: string): Promise<MensagemConversa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ig_mensagens")
    .select("id,direcao,tipo,texto,criado_em")
    .eq("contato_id", contatoId)
    .order("criado_em", { ascending: true });
  if (error) {
    console.error("[conversa]", error);
    return [];
  }
  return ((data ?? []) as { id: string; direcao: MensagemConversa["direcao"]; tipo: MensagemConversa["tipo"]; texto: string | null; criado_em: string }[]).map(
    (m) => ({ id: m.id, direcao: m.direcao, tipo: m.tipo, texto: m.texto, criadoEm: m.criado_em }),
  );
}

export type ResumoDoDia = { comentarios: number; linksEnviados: number; linksAbertos: number; falhas: number };

export async function resumoDoDia(automacaoId?: string): Promise<ResumoDoDia> {
  const vazio = { comentarios: 0, linksEnviados: 0, linksAbertos: 0, falhas: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ig_resumo_do_dia", { p_automacao: automacaoId ?? null });
  if (error) {
    console.error("[resumoDoDia]", error);
    return vazio;
  }
  const l = (Array.isArray(data) ? data[0] : data) as
    | { comentarios: number; links_enviados: number; links_abertos: number; falhas: number }
    | null
    | undefined;
  if (!l) return vazio;
  return {
    comentarios: l.comentarios,
    linksEnviados: l.links_enviados,
    linksAbertos: l.links_abertos,
    falhas: l.falhas,
  };
}

export type StatusConexao = {
  conectada: boolean;
  username: string | null;
  nome: string | null;
  fotoUrl: string | null;
  webhooksAssinados: boolean;
  conectadoEm: string | null;
  ultimoEventoEm: string | null;
};

/** Colunas explícitas: nunca `*` e jamais `token` (sem grant para authenticated). */
export async function statusConexao(): Promise<StatusConexao> {
  const desconectada: StatusConexao = {
    conectada: false,
    username: null,
    nome: null,
    fotoUrl: null,
    webhooksAssinados: false,
    conectadoEm: null,
    ultimoEventoEm: null,
  };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ig_conta")
    .select("username,nome,foto_url,webhooks_assinados,conectado_em,ultimo_evento_em")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("[statusConexao]", error);
    return desconectada;
  }
  if (!data) return desconectada;
  const c = data as {
    username: string | null;
    nome: string | null;
    foto_url: string | null;
    webhooks_assinados: boolean;
    conectado_em: string;
    ultimo_evento_em: string | null;
  };
  return {
    conectada: true,
    username: c.username,
    nome: c.nome,
    fotoUrl: c.foto_url,
    webhooksAssinados: c.webhooks_assinados,
    conectadoEm: c.conectado_em,
    ultimoEventoEm: c.ultimo_evento_em,
  };
}
