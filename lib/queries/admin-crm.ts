import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { etapasDoTipo, ETAPAS_POR_TIPO } from "@/lib/crm/etapas";
import { responsaveisVisiveis, type ResponsavelCRM } from "@/lib/crm/responsaveis";
import type { Database, LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

/**
 * Camada de leitura do CRM (docs/crm-spec.md §3.1, "server-only"). Mesmo
 * estilo de lib/queries/admin-imoveis.ts e lib/queries/admin-posts.ts: sempre
 * createClient() (anon + cookies), nunca createAdminClient() — a RLS de
 * 017_crm_funcoes_rls.sql é quem decide o que cada papel enxerga, inclusive
 * aqui na leitura (um corretor só vê os seus leads e os sem dono).
 */

// ---------------------------------------------------------------------------
// Tipo canônico da linha do quadro
// ---------------------------------------------------------------------------

/**
 * Linha do quadro do CRM — a `Row` de `vw_leads_crm` (016_crm_campos_e_tags.sql),
 * sem tradução para camelCase. É o tipo canônico consumido por
 * lib/crm/filtros.ts (busca/filtro/ordenação) e por lib/crm/calculos.ts
 * (soma da coluna): antes desta camada existir, cada um tinha inventado o
 * próprio formato (LeadQuadroCRM em filtros.ts, DadosNegocio em calculos.ts)
 * — agora que a view é conhecida em TS, os dois consomem este tipo (ou um
 * `Pick` dele) em vez de manter três formatos paralelos da mesma linha.
 *
 * `DadosNegocio` de lib/crm/calculos.ts continua à parte: ele descreve os
 * campos de origem ANTES de o lead existir no banco (tela de criação/edição
 * manual), e a própria `vw_leads_crm` já colapsa esses quatro campos
 * (valor_credito, valor_credito_desejado, valor_carta, orcamento_max) num
 * `valor_negocio` só — não há Pick desta view que recupere os quatro campos
 * separados de volta.
 */
export type LeadQuadroCRM = Database["public"]["Views"]["vw_leads_crm"]["Row"];

const TETO_POR_ETAPA = 500;
// Teto de segurança do fetch total (docs/crm-spec.md §5, caso de borda 10,
// e §6): generoso o bastante para não truncar nenhum pipeline legítimo (o
// maior tem 8 etapas), mas finito para não trazer uma tabela inteira para a
// memória do processo Next.js num volume anormal de leads.
const TETO_FETCH_TOTAL = TETO_POR_ETAPA * 20;

/**
 * Quadro de uma origem, já com o teto de 500 leads por etapa aplicado em
 * memória (docs/crm-spec.md §5, caso de borda 10) — o Postgrest não faz
 * "limit por grupo" numa consulta só, e uma consulta só é o que o §3.2/§6 da
 * spec pedem ("uma consulta por quadro"). `getContagensPorEtapa` é a
 * agregação separada que continua contando a verdade mesmo quando esta lista
 * está truncada.
 */
export async function getQuadro(tipo: LeadTipoSlug): Promise<LeadQuadroCRM[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_leads_crm")
    .select("*")
    .eq("tipo", tipo)
    // Agrupa por coluna (etapa_ordem) e, dentro dela, mais recente primeiro —
    // é também o critério que decide quem sobrevive ao teto de 500.
    .order("etapa_ordem", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(TETO_FETCH_TOTAL);

  if (error) throw error;

  const porEtapa = new Map<LeadEtapaSlug, number>();
  const resultado: LeadQuadroCRM[] = [];
  for (const linha of data ?? []) {
    const contagem = porEtapa.get(linha.status) ?? 0;
    if (contagem >= TETO_POR_ETAPA) continue;
    porEtapa.set(linha.status, contagem + 1);
    resultado.push(linha);
  }
  return resultado;
}

export type ContagemEtapaCRM = {
  etapa: LeadEtapaSlug;
  total: number;
  somaValorNegocio: number;
};

/**
 * Agregação por etapa, separada da lista de `getQuadro` (docs/crm-spec.md
 * §5, caso de borda 10): o cabeçalho da coluna ("SIMULAÇÃO 7 · R$ 4.320.000",
 * §4) precisa continuar verdadeiro mesmo quando a lista de cards está
 * truncada pelo teto de 500. Toda etapa do pipeline aparece no resultado,
 * mesmo com total zero — a coluna existe no quadro independente de ter lead
 * dentro (o inverso do caso de borda 14, que mantém a coluna mesmo
 * desativada enquanto tiver lead).
 */
export async function getContagensPorEtapa(tipo: LeadTipoSlug): Promise<ContagemEtapaCRM[]> {
  const supabase = await createClient();
  // Agregação no banco (migration 022): somar linhas aqui subcontaria assim
  // que o max-rows do PostgREST truncasse a resposta.
  const { data, error } = await supabase.rpc("contar_leads_crm", { p_tipo: tipo });
  if (error) {
    console.error("[admin-crm] contar_leads_crm falhou (por etapa)", error);
    throw error;
  }

  const mapa = new Map<string, ContagemEtapaCRM>();
  for (const linha of data ?? []) {
    mapa.set(linha.status, {
      etapa: linha.status as LeadEtapaSlug,
      total: Number(linha.total),
      somaValorNegocio: Number(linha.soma_valor_negocio),
    });
  }

  return etapasDoTipo(tipo).map(
    (etapa) => mapa.get(etapa.slug) ?? { etapa: etapa.slug, total: 0, somaValorNegocio: 0 },
  );
}

// ---------------------------------------------------------------------------
// Lead individual (modal)
// ---------------------------------------------------------------------------

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type DetalheOrigemLead =
  | { tipo: "financiamento"; dados: Database["public"]["Tables"]["lead_financiamento"]["Row"] | null }
  | { tipo: "home-equity"; dados: Database["public"]["Tables"]["lead_home_equity"]["Row"] | null }
  | { tipo: "imoveis"; dados: Database["public"]["Tables"]["lead_imovel"]["Row"] | null }
  | { tipo: "consorcio"; dados: Database["public"]["Tables"]["lead_consorcio"]["Row"] | null };

export type LeadDetalhado = {
  lead: LeadRow;
  detalhe: DetalheOrigemLead;
  tags: string[];
};

/**
 * Lead + linha de detalhe da origem + tags. A linha de detalhe pode vir
 * `null` (docs/crm-spec.md §5, caso de borda 5: lead criado à mão pode não
 * ter linha ainda) — isso não é erro, `atualizarLead` resolve com upsert na
 * hora de salvar.
 */
export async function getLead(id: string): Promise<LeadDetalhado | null> {
  const supabase = await createClient();

  const { data: lead, error: erroLead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (erroLead) throw erroLead;
  if (!lead) return null;

  let detalhe: DetalheOrigemLead;
  switch (lead.tipo) {
    case "financiamento": {
      const { data, error } = await supabase
        .from("lead_financiamento")
        .select("*")
        .eq("lead_id", id)
        .maybeSingle();
      if (error) throw error;
      detalhe = { tipo: "financiamento", dados: data };
      break;
    }
    case "home-equity": {
      const { data, error } = await supabase.from("lead_home_equity").select("*").eq("lead_id", id).maybeSingle();
      if (error) throw error;
      detalhe = { tipo: "home-equity", dados: data };
      break;
    }
    case "imoveis": {
      const { data, error } = await supabase.from("lead_imovel").select("*").eq("lead_id", id).maybeSingle();
      if (error) throw error;
      detalhe = { tipo: "imoveis", dados: data };
      break;
    }
    case "consorcio": {
      const { data, error } = await supabase.from("lead_consorcio").select("*").eq("lead_id", id).maybeSingle();
      if (error) throw error;
      detalhe = { tipo: "consorcio", dados: data };
      break;
    }
  }

  const { data: tagsLinhas, error: erroTags } = await supabase
    .from("lead_tags")
    .select("tag_slug")
    .eq("lead_id", id);
  if (erroTags) throw erroTags;

  return { lead, detalhe, tags: (tagsLinhas ?? []).map((linha) => linha.tag_slug) };
}

export type UsuarioCRM = { id: string | null; souAdmin: boolean };

/**
 * Quem está olhando e se é admin. Só decide o que MOSTRAR (botão de exportar,
 * editar/apagar interação): a autoridade continua sendo a action + a RLS
 * (migration 024) — esconder botão não é controle de acesso.
 */
export async function getUsuarioCRM(): Promise<UsuarioCRM> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: null, souAdmin: false };
  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { id: user.id, souAdmin: perfil?.role === "admin" };
}

export type LinhaTimelineCRM = Database["public"]["Views"]["vw_crm_timeline"]["Row"];

/** Linha do tempo unificada (interações, transições de etapa e lembretes), mais recente primeiro. Sob demanda — nunca junto do quadro (docs/crm-spec.md §3.2). */
export async function getTimeline(leadId: string): Promise<LinhaTimelineCRM[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_crm_timeline")
    .select("*")
    .eq("lead_id", leadId)
    .order("ocorrido_em", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

type LembreteRow = Database["public"]["Tables"]["crm_lembretes"]["Row"];

/** Todos os lembretes do lead (pendentes e concluídos), pendentes primeiro e por data mais próxima. */
export async function getLembretes(leadId: string): Promise<LembreteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_lembretes")
    .select("*")
    .eq("lead_id", leadId)
    .order("concluido", { ascending: true })
    .order("agendado_para", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type SimulacaoEnviada = {
  id: string;
  created_at: string;
  /** `anexado`: PDF gravado, nenhum e-mail enviado (migration 032). */
  email_status: "anexado" | "enviado" | "falhou" | "sem-chave";
  /** Quando o e-mail saiu (032); nulo = não enviada, ou enviada antes da coluna existir. */
  enviado_em: string | null;
  /** Nome de quem anexou; null se o perfil foi removido. */
  autor: string | null;
};

/**
 * Histórico de simulações do lead, anexadas ou enviadas (migrations 030/032). Nunca lança: o
 * bloco "Simulações" não pode derrubar o modal, e a tabela pode ainda não
 * existir num deploy que chegou antes da migration. Erro vira console.error e
 * lista vazia.
 */
export async function getSimulacoes(leadId: string): Promise<SimulacaoEnviada[]> {
  try {
    const supabase = await createClient();
    const completa = await supabase
      .from("crm_simulacoes")
      .select("id, created_at, email_status, enviado_em, criado_por")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    let linhas = completa.data ?? [];
    if (completa.error) {
      // Deploy que chegou antes da 032: sem a coluna enviado_em o histórico ainda precisa aparecer.
      console.error("[getSimulacoes] leitura com enviado_em falhou; tentando sem a coluna:", completa.error);
      const semColuna = await supabase
        .from("crm_simulacoes")
        .select("id, created_at, email_status, criado_por")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (semColuna.error) {
        console.error("[getSimulacoes] não foi possível ler o histórico:", semColuna.error);
        return [];
      }
      linhas = (semColuna.data ?? []).map((l) => ({ ...l, enviado_em: null }));
    }
    const ids = [...new Set(linhas.map((l) => l.criado_por).filter((v): v is string => Boolean(v)))];
    const nomes = new Map<string, string>();
    if (ids.length > 0) {
      const { data: perfis } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      for (const p of perfis ?? []) if (p.full_name) nomes.set(p.id, p.full_name);
    }
    return linhas.map((l) => ({
      id: l.id,
      created_at: l.created_at,
      email_status: l.email_status,
      enviado_em: l.enviado_em,
      autor: l.criado_por ? (nomes.get(l.criado_por) ?? null) : null,
    }));
  } catch (e) {
    console.error("[getSimulacoes] exceção ao ler o histórico:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Arquivados
// ---------------------------------------------------------------------------

export type LeadArquivado = LeadRow & {
  tipoInfo: Pick<Database["public"]["Tables"]["lead_tipos"]["Row"], "slug" | "label">;
  corretor: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name"> | null;
};

// `profiles` precisa do nome da FK explícito: `leads` tem DUAS colunas
// apontando para `profiles` — `corretor_id` (migration 002) e `arquivado_por`
// (migration 014) — e o PostgREST recusa o embed ambíguo com PGRST201 em vez
// de escolher uma. Sem `!leads_corretor_id_fkey`, a tela inteira quebra.
const SELECT_ARQUIVADO =
  "*, tipoInfo:lead_tipos(slug, label), corretor:profiles!leads_corretor_id_fkey(full_name)";

/**
 * Leads arquivados — a `vw_leads_crm` filtra `arquivado_em is null`
 * (docs/crm-spec.md §5, caso de borda 6), então a lixeira precisa ler
 * `leads` diretamente. Mais recentemente arquivado primeiro.
 */
export async function getArquivados(): Promise<LeadArquivado[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(SELECT_ARQUIVADO)
    .not("arquivado_em", "is", null)
    .order("arquivado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as LeadArquivado[];
}

// ---------------------------------------------------------------------------
// Domínios (etapas, motivos, tipos de interação, tags, corretores)
// ---------------------------------------------------------------------------

export type DominiosCRM = {
  // Etapas não fazem round-trip ao banco: já são conhecidas em TS
  // (lib/crm/etapas.ts espelha os seeds da migration 014) — buscar de novo
  // aqui só duplicaria uma consulta por algo que o código já sabe.
  etapasPorTipo: typeof ETAPAS_POR_TIPO;
  motivosPerda: Database["public"]["Tables"]["crm_motivos_perda"]["Row"][];
  tiposInteracao: Database["public"]["Tables"]["crm_interacao_tipos"]["Row"][];
  tags: Database["public"]["Tables"]["crm_tags"]["Row"][];
  corretores: ResponsavelCRM[];
};

/** Domínio do módulo, cacheado por request (React `cache`) — várias partes da página pedem a mesma coisa. */
export const getDominios = cache(async function getDominios(): Promise<DominiosCRM> {
  const supabase = await createClient();
  const [motivos, tiposInteracao, tags, corretores] = await Promise.all([
    supabase.from("crm_motivos_perda").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("crm_interacao_tipos").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("crm_tags").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    // select("*") de propósito: listar `oculto_no_crm` aqui derrubaria o CRM
    // no intervalo entre o deploy da branch e a migration 029 rodar (ela só é
    // aplicada no merge em Preview, e a branch é testada antes, contra o
    // mesmo banco). Com "*", a coluna ausente só significa "ninguém oculto".
    // O filtro e o recorte para 4 campos ficam em `responsaveisVisiveis`:
    // nada além disso chega ao cliente.
    supabase.from("profiles").select("*").order("full_name", { ascending: true }),
  ]);

  if (motivos.error) throw motivos.error;
  if (tiposInteracao.error) throw tiposInteracao.error;
  if (tags.error) throw tags.error;
  if (corretores.error) throw corretores.error;

  return {
    etapasPorTipo: ETAPAS_POR_TIPO,
    motivosPerda: motivos.data ?? [],
    tiposInteracao: tiposInteracao.data ?? [],
    tags: tags.data ?? [],
    corretores: responsaveisVisiveis(corretores.data ?? []),
  };
});

export type ContagemAbaCRM = { tipo: LeadTipoSlug; total: number };

/** Total de leads não arquivados por tipo, para o cabeçalho de abas (docs/crm-spec.md §3.1). Todo tipo aparece, mesmo com zero (a aba Consórcio nasce vazia). */
export async function getContagensPorAba(): Promise<ContagemAbaCRM[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("contar_leads_crm");
  if (error) {
    console.error("[admin-crm] contar_leads_crm falhou (por aba)", error);
    throw error;
  }

  const mapa = new Map<string, number>();
  for (const linha of data ?? []) {
    mapa.set(linha.tipo, (mapa.get(linha.tipo) ?? 0) + Number(linha.total));
  }

  return (Object.keys(ETAPAS_POR_TIPO) as LeadTipoSlug[]).map((tipo) => ({
    tipo,
    total: mapa.get(tipo) ?? 0,
  }));
}
