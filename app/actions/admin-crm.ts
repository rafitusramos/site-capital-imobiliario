"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { etapaInicial } from "@/lib/crm/etapas";
import { slugify } from "@/lib/blog/slugify";
import {
  atribuirResponsavelSchema,
  atualizarLeadComumSchema,
  criarLeadConsorcioSchema,
  criarLeadFinanciamentoSchema,
  criarLeadHomeEquitySchema,
  criarLeadImovelSchema,
  criarTagSchema,
  definirTagsSchema,
  lembreteReagendarSchema,
  moverLeadBaseSchema,
  novaInteracaoSchema,
  schemaAtualizarLeadPorTipo,
  schemaCriarLeadPorTipo,
} from "@/lib/validations/crm";
import type { LeadEtapaSlug, LeadInteracaoTipo, LeadTipoSlug } from "@/types/database";

/**
 * Todas as server actions do módulo de CRM (docs/crm-spec.md §3.5). Mesmo
 * estilo de app/actions/admin-parametros.ts e app/actions/admin-imoveis.ts:
 * `AcaoResultado` como retorno, `usuarioAutenticado()` no início de cada
 * função, `createClient()` (anon + cookies) — nunca `createAdminClient()`,
 * porque aqui é a RLS de 017_crm_funcoes_rls.sql quem decide o que cada
 * papel pode fazer, não o código da action.
 */

export interface AcaoResultado {
  sucesso: boolean;
  erro?: string;
}

export interface CriarLeadResultado extends AcaoResultado {
  id?: string;
  protocolo?: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function usuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const idSchema = z.string().uuid();

// ---------------------------------------------------------------------------
// Tradução dos códigos de exceção do Postgres (017_crm_funcoes_rls.sql) para
// mensagem em português. `mover_lead_crm` e `registrar_interacao_crm` levantam
// essas exceções com `raise exception '<CODIGO>'` — sem interpolação — então
// `error.message` chega aqui exatamente igual ao nome da exceção.
// ---------------------------------------------------------------------------
const MENSAGENS_ERRO_BANCO: Record<string, string> = {
  LEAD_NAO_ENCONTRADO: "Lead não encontrado.",
  LEAD_DESATUALIZADO: "Este lead mudou em outra aba. Atualize a página.",
  ETAPA_INVALIDA: "Etapa inválida para este pipeline.",
  MOTIVO_OBRIGATORIO: "Selecione um motivo para mover para esta etapa.",
  MOTIVO_OBS_OBRIGATORIA: "Descreva o motivo em pelo menos 5 caracteres.",
  ATRIBUICAO_NAO_PERMITIDA: "Você não tem permissão para reatribuir este lead.",
  LEMBRETE_DESCRICAO_OBRIGATORIA: "Descreva o lembrete.",
};

function traduzirErro(error: { message?: string } | null | undefined, generico: string): string {
  const mensagem = error?.message?.trim();
  if (mensagem && MENSAGENS_ERRO_BANCO[mensagem]) return MENSAGENS_ERRO_BANCO[mensagem];
  return generico;
}

// Toda mutação bem-sucedida revalida o quadro — regra dura do escopo desta
// feature (o quadro é a única rota afetada por qualquer ação daqui).
function revalidarQuadro() {
  revalidatePath("/admin/crm/[origem]", "page");
}

// ---------------------------------------------------------------------------
// Mapeamento camelCase (schemas Zod) -> snake_case (colunas das tabelas de
// detalhe). `lib/crm/campos.ts` já usa `chave` como o nome da coluna; aqui é
// o mesmo mapeamento, mas partindo do lado validado (lib/validations/crm.ts),
// que usa camelCase para casar com o padrão de lib/validations/lead.ts.
// ---------------------------------------------------------------------------

type DadosFinanciamento = z.infer<typeof criarLeadFinanciamentoSchema>;
type DadosHomeEquity = z.infer<typeof criarLeadHomeEquitySchema>;
type DadosImovel = z.infer<typeof criarLeadImovelSchema>;
type DadosConsorcio = z.infer<typeof criarLeadConsorcioSchema>;

function camposFinanciamento(d: DadosFinanciamento) {
  return {
    valor_imovel: d.valorImovel ?? null,
    percentual_entrada: d.percentualEntrada ?? null,
    valor_entrada: d.valorEntrada ?? null,
    valor_credito: d.valorCredito ?? null,
    prazo_meses: d.prazoMeses ?? null,
    parcela_estimada: d.parcelaEstimada ?? null,
    banco_simulado: d.bancoSimulado ?? null,
    renda_mensal: d.rendaMensal ?? null,
    usa_fgts: d.usaFgts ?? null,
    tipo_imovel: d.tipoImovel ?? null,
    primeiro_imovel: d.primeiroImovel ?? null,
    tipo_remuneracao: d.tipoRemuneracao ?? null,
    momento_compra: d.momentoCompra ?? null,
    cidade: d.cidade ?? null,
    estado: d.estado ?? null,
  };
}

function camposHomeEquity(d: DadosHomeEquity) {
  return {
    valor_imovel_garantia: d.valorImovelGarantia ?? null,
    imovel_quitado: d.imovelQuitado ?? null,
    saldo_devedor: d.saldoDevedor ?? null,
    valor_credito_desejado: d.valorCreditoDesejado ?? null,
    valor_credito_estimado: d.valorCreditoEstimado ?? null,
    prazo_meses: d.prazoMeses ?? null,
    parcela_estimada: d.parcelaEstimada ?? null,
    finalidade: d.finalidade ?? null,
    tipo_imovel: d.tipoImovel ?? null,
    pessoa: d.pessoa ?? null,
    renda_mensal: d.rendaMensal ?? null,
    tipo_remuneracao: d.tipoRemuneracao ?? null,
    cep: d.cep ?? null,
    numero: d.numero ?? null,
    area_m2: d.areaM2 ?? null,
    // situacao_imovel NÃO entra mais aqui (item 5 dos ajustes de CRM, rodada
    // 2): a coluna continua no banco com os dados antigos, mas a interface
    // parou de gravar nela — incluir `situacao_imovel: d.situacaoImovel ??
    // null` voltaria a apagar o valor existente a cada salvamento, já que
    // este objeto substitui TODAS as chaves do upsert.
  };
}

function camposImovel(d: DadosImovel) {
  return {
    forma_pagamento: d.formaPagamento ?? null,
    prazo_compra: d.prazoCompra ?? null,
    possui_entrada: d.possuiEntrada ?? null,
    valor_entrada: d.valorEntrada ?? null,
    ja_tem_aprovacao: d.jaTemAprovacao ?? null,
    observacoes: d.observacoes ?? null,
    imovel_desejado: d.imovelDesejado ?? null,
    orcamento_max: d.orcamentoMax ?? null,
    cidade_preferida: d.cidadePreferida ?? null,
    dormitorios_min: d.dormitoriosMin ?? null,
    tipo_imovel: d.tipoImovel ?? null,
  };
}

function camposConsorcio(d: DadosConsorcio) {
  return {
    valor_carta: d.valorCarta ?? null,
    prazo_meses: d.prazoMeses ?? null,
    parcela_estimada: d.parcelaEstimada ?? null,
    objetivo: d.objetivo ?? null,
    ja_possui_consorcio: d.jaPossuiConsorcio ?? null,
    segmento: d.segmento ?? null,
    grupo: d.grupo ?? null,
    contemplacao: d.contemplacao ?? null,
  };
}

type DetalheEntrada =
  | { tipo: "financiamento"; dados: DadosFinanciamento }
  | { tipo: "home-equity"; dados: DadosHomeEquity }
  | { tipo: "imoveis"; dados: DadosImovel }
  | { tipo: "consorcio"; dados: DadosConsorcio };

/** Insere a linha de detalhe da origem — usado só na criação (a linha ainda não existe). */
function inserirDetalheOrigem(supabase: SupabaseServerClient, leadId: string, entrada: DetalheEntrada) {
  switch (entrada.tipo) {
    case "financiamento":
      return supabase.from("lead_financiamento").insert({ lead_id: leadId, ...camposFinanciamento(entrada.dados) });
    case "home-equity":
      return supabase.from("lead_home_equity").insert({ lead_id: leadId, ...camposHomeEquity(entrada.dados) });
    case "imoveis":
      return supabase.from("lead_imovel").insert({ lead_id: leadId, ...camposImovel(entrada.dados) });
    case "consorcio":
      return supabase.from("lead_consorcio").insert({ lead_id: leadId, ...camposConsorcio(entrada.dados) });
  }
}

/**
 * Upsert manual (checa existência, então update ou insert) na tabela de
 * detalhe — não `.upsert()`: é o mesmo padrão de reconciliação que
 * app/actions/admin-imoveis.ts já usa para coleções, e o cliente Supabase
 * falso usado nos testes (tests/apoio/supabase-falso.ts) só simula
 * select/insert/update/delete, não upsert. Necessário porque um lead criado
 * à mão pode não ter linha de detalhe ainda (docs/crm-spec.md §5, caso de
 * borda 5) — um update seco não criaria a linha na primeira edição.
 */
async function upsertDetalheOrigem(supabase: SupabaseServerClient, leadId: string, entrada: DetalheEntrada) {
  switch (entrada.tipo) {
    case "financiamento": {
      const { data: existente, error: erroSelect } = await supabase
        .from("lead_financiamento")
        .select("lead_id")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (erroSelect) return { error: erroSelect };
      if (existente) return supabase.from("lead_financiamento").update(camposFinanciamento(entrada.dados)).eq("lead_id", leadId);
      return supabase.from("lead_financiamento").insert({ lead_id: leadId, ...camposFinanciamento(entrada.dados) });
    }
    case "home-equity": {
      const { data: existente, error: erroSelect } = await supabase
        .from("lead_home_equity")
        .select("lead_id")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (erroSelect) return { error: erroSelect };
      if (existente) return supabase.from("lead_home_equity").update(camposHomeEquity(entrada.dados)).eq("lead_id", leadId);
      return supabase.from("lead_home_equity").insert({ lead_id: leadId, ...camposHomeEquity(entrada.dados) });
    }
    case "imoveis": {
      const { data: existente, error: erroSelect } = await supabase
        .from("lead_imovel")
        .select("lead_id")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (erroSelect) return { error: erroSelect };
      if (existente) return supabase.from("lead_imovel").update(camposImovel(entrada.dados)).eq("lead_id", leadId);
      return supabase.from("lead_imovel").insert({ lead_id: leadId, ...camposImovel(entrada.dados) });
    }
    case "consorcio": {
      const { data: existente, error: erroSelect } = await supabase
        .from("lead_consorcio")
        .select("lead_id")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (erroSelect) return { error: erroSelect };
      if (existente) return supabase.from("lead_consorcio").update(camposConsorcio(entrada.dados)).eq("lead_id", leadId);
      return supabase.from("lead_consorcio").insert({ lead_id: leadId, ...camposConsorcio(entrada.dados) });
    }
  }
}

// ---------------------------------------------------------------------------
// moverLead
// ---------------------------------------------------------------------------

export interface MoverLeadInput {
  leadId: string;
  etapa: LeadEtapaSlug;
  motivo?: string;
  motivoObs?: string;
  /** Concorrência otimista (docs/crm-spec.md §5, caso de borda 3): comparado contra leads.updated_at dentro do RPC. */
  updatedAt?: string;
}

/**
 * Move um lead de etapa via RPC `mover_lead_crm` — nunca por update solto
 * (regra dura do escopo): é lá que a regra de motivo obrigatório e a
 * concorrência otimista vivem, e vale tanto para o arrastar quanto para o
 * `select` do formulário sem duplicar a regra.
 *
 * A validação aqui (`moverLeadBaseSchema`) é só de formato (uuid, etapa não
 * vazia) — de propósito NÃO usa `schemaMoverLead(tipo)` de
 * lib/validations/crm.ts, que faz a validação completa de motivo obrigatório
 * contra o pipeline. Aquele schema é para o formulário no cliente dar
 * feedback antes do round-trip; a action confia na RPC como autoridade da
 * regra de negócio e traduz `MOTIVO_OBRIGATORIO`/`MOTIVO_OBS_OBRIGATORIA` em
 * mensagem pt-BR — duplicar a checagem aqui só tornaria essas duas exceções
 * inalcançáveis a partir da action.
 */
export async function moverLead(input: MoverLeadInput): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = moverLeadBaseSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, error } = await supabase.rpc("mover_lead_crm", {
    p_lead_id: parsed.data.leadId,
    p_etapa: parsed.data.etapa,
    p_motivo: parsed.data.motivo ?? null,
    p_motivo_obs: parsed.data.motivoObs ?? null,
    p_updated_at: parsed.data.updatedAt ?? null,
  });

  if (error) return { sucesso: false, erro: traduzirErro(error, "Não foi possível mover o lead.") };
  if (!data) return { sucesso: false, erro: "Lead não encontrado." };

  revalidarQuadro();
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// criarLead
// ---------------------------------------------------------------------------

export interface CriarLeadInput {
  tipo: LeadTipoSlug;
  dados: Record<string, unknown>;
}

/**
 * Cria o lead E a linha de detalhe da origem (regra dura do escopo). A
 * ausência da linha de detalhe não invalida o lead recém-criado (caso de
 * borda 5 já é suportado desde a criação: um lead sem nenhum campo de
 * origem preenchido é um estado legítimo) — por isso um erro só no insert
 * de detalhe não desfaz o lead, apenas avisa o operador.
 */
export async function criarLead(input: CriarLeadInput): Promise<CriarLeadResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const schema = schemaCriarLeadPorTipo[input.tipo];
  const parsed = schema.safeParse(input.dados);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const dados = parsed.data as {
    nome: string;
    email: string;
    telefone: string;
    cpf?: string;
    corretorId?: string | null;
  };

  const { data: lead, error: erroLead } = await supabase
    .from("leads")
    .insert({
      tipo: input.tipo,
      // Etapa inicial do pipeline (sempre 'criado' — ver lib/crm/etapas.ts).
      // Explícito aqui em vez de confiar só no `default` da coluna: a fonte
      // da verdade de qual é a etapa inicial agora é esse módulo TS,
      // espelhado da migration 014.
      status: etapaInicial(input.tipo).slug,
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      cpf: dados.cpf ?? null,
      corretor_id: dados.corretorId ?? null,
      // Lead de imóvel pode já nascer ligado a um empreendimento do
      // catálogo — a coluna vive em `leads.imovel_id`, não em
      // `lead_imovel` (que não tem essa coluna).
      imovel_id: input.tipo === "imoveis" ? ((parsed.data as DadosImovel).imovelId ?? null) : null,
      // Criação manual no CRM (decisão travada #2, docs/crm-spec.md): sem
      // formulário público por trás, diferente dos RPCs criar_lead_* do
      // site — não há consentimento LGPD de formulário para gravar aqui, o
      // default (false) da coluna permanece.
      origem: "crm-manual",
    })
    .select("id, protocolo")
    .single();

  if (erroLead || !lead) {
    return { sucesso: false, erro: "Não foi possível criar o lead." };
  }

  const { error: erroDetalhe } = await inserirDetalheOrigem(supabase, lead.id, {
    tipo: input.tipo,
    dados: parsed.data,
  } as DetalheEntrada);

  if (erroDetalhe) {
    return {
      sucesso: true,
      id: lead.id,
      protocolo: lead.protocolo,
      erro: "Lead criado, mas os campos específicos da origem não foram salvos. Edite o lead para tentar novamente.",
    };
  }

  revalidarQuadro();
  return { sucesso: true, id: lead.id, protocolo: lead.protocolo };
}

// ---------------------------------------------------------------------------
// atualizarLead
// ---------------------------------------------------------------------------

export interface AtualizarLeadInput {
  leadId: string;
  tipo: LeadTipoSlug;
  comum?: Partial<{
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    corretorId: string | null;
  }>;
  origem?: Record<string, unknown>;
}

/** Atualiza dados comuns e/ou campos de origem. A origem faz upsert (caso de borda 5) — nunca update seco. */
export async function atualizarLead(input: AtualizarLeadInput): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  if (!idSchema.safeParse(input.leadId).success) {
    return { sucesso: false, erro: "Lead inválido." };
  }

  if (input.comum) {
    const parsedComum = atualizarLeadComumSchema.safeParse(input.comum);
    if (!parsedComum.success) {
      return { sucesso: false, erro: parsedComum.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const camposComuns: Record<string, unknown> = {};
    if (parsedComum.data.nome !== undefined) camposComuns.nome = parsedComum.data.nome;
    if (parsedComum.data.email !== undefined) camposComuns.email = parsedComum.data.email;
    if (parsedComum.data.telefone !== undefined) camposComuns.telefone = parsedComum.data.telefone;
    if (parsedComum.data.cpf !== undefined) camposComuns.cpf = parsedComum.data.cpf ?? null;
    if (parsedComum.data.corretorId !== undefined) camposComuns.corretor_id = parsedComum.data.corretorId;

    if (Object.keys(camposComuns).length > 0) {
      // `camposComuns` é montado dinamicamente (só os campos informados) —
      // o `Database` tipado não infere um `Update` parcial a partir de um
      // `Record<string, unknown>` genérico; o cast é seguro porque toda
      // chave vem de `atualizarLeadComumSchema`, já validada acima.
      const { data, error } = await supabase
        .from("leads")
        .update(camposComuns as never)
        .eq("id", input.leadId)
        .select("id");
      if (error) return { sucesso: false, erro: "Não foi possível salvar os dados do lead." };
      if (!data || data.length === 0) {
        return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para editá-lo." };
      }
    }
  }

  if (input.origem) {
    const schemaOrigem = schemaAtualizarLeadPorTipo[input.tipo];
    const parsedOrigem = schemaOrigem.safeParse(input.origem);
    if (!parsedOrigem.success) {
      return { sucesso: false, erro: parsedOrigem.error.issues[0]?.message ?? "Dados inválidos." };
    }

    const { error } = await upsertDetalheOrigem(supabase, input.leadId, {
      tipo: input.tipo,
      dados: parsedOrigem.data,
    } as DetalheEntrada);
    if (error) return { sucesso: false, erro: "Não foi possível salvar os campos específicos." };
  }

  revalidarQuadro();
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// arquivarLead / restaurarLead
// ---------------------------------------------------------------------------

/** A lixeira arquiva (decisão travada #3, docs/crm-spec.md): preserva o dado, some do quadro (o filtro mora na view). */
export async function arquivarLead(leadId: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  if (!idSchema.safeParse(leadId).success) return { sucesso: false, erro: "Lead inválido." };

  const { data, error } = await supabase
    .from("leads")
    .update({ arquivado_em: new Date().toISOString(), arquivado_por: user.id })
    .eq("id", leadId)
    .select("id");

  if (error) return { sucesso: false, erro: "Não foi possível arquivar o lead." };
  if (!data || data.length === 0) {
    return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para arquivá-lo." };
  }

  revalidarQuadro();
  revalidatePath("/admin/crm/arquivados");
  return { sucesso: true };
}

export async function restaurarLead(leadId: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  if (!idSchema.safeParse(leadId).success) return { sucesso: false, erro: "Lead inválido." };

  const { data, error } = await supabase
    .from("leads")
    .update({ arquivado_em: null, arquivado_por: null })
    .eq("id", leadId)
    .select("id");

  if (error) return { sucesso: false, erro: "Não foi possível restaurar o lead." };
  if (!data || data.length === 0) {
    return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para restaurá-lo." };
  }

  revalidarQuadro();
  revalidatePath("/admin/crm/arquivados");
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// excluirLead
// ---------------------------------------------------------------------------

/**
 * Exclusão definitiva — só admin (docs/crm-spec.md §3.5). Diferente das
 * outras ações, a RLS de `leads` (`leads_visiveis`) NÃO restringe DELETE a
 * admin: um corretor pode apagar os próprios leads ou os sem dono pela
 * mesma policy que o deixa editá-los. Por isso o papel é checado aqui, na
 * action — a única ação deste arquivo que precisa disso, porque é a única
 * em que a RLS sozinha não impõe a regra de negócio.
 *
 * Grava `crm_exclusoes` (protocolo, tipo, quem, motivo) ANTES do delete em
 * cascata (regra dura do escopo) — depois de apagado não haveria mais de
 * onde ler protocolo/tipo para o registro.
 */
export async function excluirLead(leadId: string, motivo?: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  if (!idSchema.safeParse(leadId).success) return { sucesso: false, erro: "Lead inválido." };

  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (erroPerfil) return { sucesso: false, erro: "Não foi possível confirmar sua permissão." };
  if (!perfil || perfil.role !== "admin") {
    return { sucesso: false, erro: "Somente administradores podem excluir leads definitivamente." };
  }

  const { data: lead, error: erroLead } = await supabase
    .from("leads")
    .select("protocolo, tipo")
    .eq("id", leadId)
    .maybeSingle();
  if (erroLead) return { sucesso: false, erro: "Não foi possível localizar o lead." };
  if (!lead) return { sucesso: false, erro: "Lead não encontrado." };

  const { error: erroRegistro } = await supabase.from("crm_exclusoes").insert({
    protocolo: lead.protocolo,
    tipo: lead.tipo,
    excluido_por: user.id,
    motivo: motivo ?? null,
  });
  if (erroRegistro) return { sucesso: false, erro: "Não foi possível registrar a exclusão." };

  const { data: excluido, error: erroDelete } = await supabase.from("leads").delete().eq("id", leadId).select("id");
  if (erroDelete) return { sucesso: false, erro: "Não foi possível excluir o lead." };
  if (!excluido || excluido.length === 0) {
    return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para excluí-lo." };
  }

  revalidarQuadro();
  revalidatePath("/admin/crm/arquivados");
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// registrarInteracao
// ---------------------------------------------------------------------------

export interface RegistrarInteracaoInput {
  leadId: string;
  tipo: LeadInteracaoTipo;
  conteudo: string;
  lembrete?: { agendadoPara: string; descricao: string };
}

/** Grava interação e lembrete (quando informado) via RPC `registrar_interacao_crm` — transação só, nunca dois inserts soltos. */
export async function registrarInteracao(input: RegistrarInteracaoInput): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = novaInteracaoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, error } = await supabase.rpc("registrar_interacao_crm", {
    p_lead_id: parsed.data.leadId,
    p_tipo: parsed.data.tipo,
    p_conteudo: parsed.data.conteudo,
    p_lembrete_em: parsed.data.lembrete?.agendadoPara ?? null,
    p_lembrete_desc: parsed.data.lembrete?.descricao ?? null,
  });

  if (error) return { sucesso: false, erro: traduzirErro(error, "Não foi possível registrar a interação.") };
  if (!data) return { sucesso: false, erro: "Não foi possível registrar a interação." };

  revalidarQuadro();
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// concluirLembrete / reagendarLembrete
// ---------------------------------------------------------------------------

export async function concluirLembrete(lembreteId: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  if (!idSchema.safeParse(lembreteId).success) return { sucesso: false, erro: "Lembrete inválido." };

  const { data, error } = await supabase
    .from("crm_lembretes")
    .update({ concluido: true, concluido_em: new Date().toISOString(), concluido_por: user.id })
    .eq("id", lembreteId)
    .select("id");

  if (error) return { sucesso: false, erro: "Não foi possível concluir o lembrete." };
  if (!data || data.length === 0) {
    return { sucesso: false, erro: "Lembrete não encontrado ou você não tem permissão para alterá-lo." };
  }

  revalidarQuadro();
  return { sucesso: true };
}

export async function reagendarLembrete(lembreteId: string, novaData: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = lembreteReagendarSchema.safeParse({ lembreteId, agendadoPara: novaData });
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, error } = await supabase
    .from("crm_lembretes")
    .update({ agendado_para: parsed.data.agendadoPara })
    .eq("id", parsed.data.lembreteId)
    .select("id");

  if (error) return { sucesso: false, erro: "Não foi possível reagendar o lembrete." };
  if (!data || data.length === 0) {
    return { sucesso: false, erro: "Lembrete não encontrado ou você não tem permissão para alterá-lo." };
  }

  revalidarQuadro();
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// alternarFavorito
// ---------------------------------------------------------------------------

export async function alternarFavorito(leadId: string): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  if (!idSchema.safeParse(leadId).success) return { sucesso: false, erro: "Lead inválido." };

  const { data: atual, error: erroLeitura } = await supabase
    .from("leads")
    .select("favorito")
    .eq("id", leadId)
    .maybeSingle();
  if (erroLeitura) return { sucesso: false, erro: "Não foi possível ler o lead." };
  if (!atual) return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para acessá-lo." };

  const { data, error } = await supabase
    .from("leads")
    .update({ favorito: !atual.favorito })
    .eq("id", leadId)
    .select("id");

  if (error) return { sucesso: false, erro: "Não foi possível atualizar o favorito." };
  if (!data || data.length === 0) {
    return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para alterá-lo." };
  }

  revalidarQuadro();
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// definirTags
// ---------------------------------------------------------------------------

/** Substitui o conjunto de tags do lead (máx. 8 — lib/validations/crm.ts). */
export async function definirTags(leadId: string, tags: string[]): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = definirTagsSchema.safeParse({ leadId, tags });
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Confirma que o lead é visível (RLS) antes de mexer em lead_tags: um
  // delete que não casa linha nenhuma é sucesso silencioso no Postgres, e
  // sem essa checagem prévia não haveria como distinguir "sem tag nenhuma"
  // de "sem permissão nesse lead" (regra do projeto).
  const { data: lead, error: erroLead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", parsed.data.leadId)
    .maybeSingle();
  if (erroLead) return { sucesso: false, erro: "Não foi possível ler o lead." };
  if (!lead) return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para acessá-lo." };

  const { error: erroDelete } = await supabase.from("lead_tags").delete().eq("lead_id", parsed.data.leadId);
  if (erroDelete) return { sucesso: false, erro: "Não foi possível atualizar as tags." };

  if (parsed.data.tags.length > 0) {
    const { error: erroInsert } = await supabase
      .from("lead_tags")
      .insert(parsed.data.tags.map((tagSlug) => ({ lead_id: parsed.data.leadId, tag_slug: tagSlug })));
    if (erroInsert) return { sucesso: false, erro: "Não foi possível salvar as novas tags." };
  }

  revalidarQuadro();
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// criarTag
// ---------------------------------------------------------------------------

export interface CriarTagResultado extends AcaoResultado {
  tag?: { slug: string; label: string; cor: string };
}

/**
 * Cria uma tag nova no catálogo compartilhado `crm_tags` (item 6 dos ajustes
 * de CRM, rodada 2 — primeira interface de criação; até aqui o catálogo só
 * crescia por SQL Editor). `lead_tags.tag_slug` é FK para `crm_tags.slug`
 * (016), então não existe tag solta por lead: toda tag nova entra aqui e
 * passa a valer para todos os leads.
 *
 * RLS `crm_tags_admin_write` (017) restringe a escrita a admin
 * (`eh_admin()`) — um corretor recebe a violação de RLS do Postgres (código
 * 42501) direto do insert, sem checagem de papel no cliente: o banco é a
 * autoridade, mesmo padrão do resto deste arquivo.
 */
export async function criarTag(label: string): Promise<CriarTagResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = criarTagSchema.safeParse({ label });
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const slug = slugify(parsed.data.label);
  if (!slug) return { sucesso: false, erro: "Use letras ou números no nome da tag." };

  // Sem `.order()`/`.limit()` de propósito: o cliente Supabase falso dos
  // testes (tests/apoio/supabase-falso.ts) só simula
  // select/insert/update/delete encadeados com `eq`/`in`, e o catálogo de
  // tags é pequeno o bastante para calcular o maior `ordem` em memória.
  const { data: existentes, error: erroSelect } = await supabase.from("crm_tags").select("slug, label, cor, ordem");
  if (erroSelect) return { sucesso: false, erro: "Não foi possível verificar as tags existentes." };

  // Slug já existente não é erro: o operador digitando "Urgente" quando
  // "urgente" já está no catálogo quer a tag que já existe, não uma
  // duplicata rejeitada pela PK de crm_tags.
  const existente = existentes?.find((t) => t.slug === slug);
  if (existente) {
    return { sucesso: true, tag: { slug: existente.slug, label: existente.label, cor: existente.cor } };
  }

  const maiorOrdem = existentes && existentes.length > 0 ? Math.max(...existentes.map((t) => t.ordem)) : 0;

  const { data: nova, error: erroInsert } = await supabase
    .from("crm_tags")
    .insert({ slug, label: parsed.data.label, ordem: maiorOrdem + 1 })
    .select("slug, label, cor")
    .single();

  if (erroInsert) {
    // 42501 é o código padrão do Postgres para violação de RLS (não uma
    // exceção customizada como `raise exception 'CODIGO'` — crm_tags_admin_write
    // é uma policy declarativa comum, sem função de trigger por trás).
    if (erroInsert.code === "42501") return { sucesso: false, erro: "Só administradores podem criar tags novas." };
    return { sucesso: false, erro: "Não foi possível criar a tag." };
  }
  if (!nova) return { sucesso: false, erro: "Não foi possível criar a tag." };

  revalidarQuadro();
  return { sucesso: true, tag: { slug: nova.slug, label: nova.label, cor: nova.cor } };
}

// ---------------------------------------------------------------------------
// atribuirResponsavel
// ---------------------------------------------------------------------------

/**
 * Reatribui o responsável do lead. Sem checagem de papel aqui: quem decide
 * o que é permitido é a RLS (`leads_visiveis`) + o trigger
 * `trg_leads_atribuicao` (017_crm_funcoes_rls.sql) — um corretor pode
 * assumir um lead sem dono (null -> ele mesmo), mas não repassar nem
 * devolver o próprio; o banco é a autoridade dessa distinção (ela depende do
 * valor ANTIGO de corretor_id, que só o trigger enxerga), e o erro
 * `ATRIBUICAO_NAO_PERMITIDA` chega aqui como `error` para ser traduzido.
 */
export async function atribuirResponsavel(leadId: string, corretorId: string | null): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = atribuirResponsavelSchema.safeParse({ leadId, corretorId });
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ corretor_id: parsed.data.corretorId })
    .eq("id", parsed.data.leadId)
    .select("id");

  if (error) {
    return { sucesso: false, erro: traduzirErro(error, "Não foi possível reatribuir o lead.") };
  }
  if (!data || data.length === 0) {
    return { sucesso: false, erro: "Lead não encontrado ou você não tem permissão para reatribuí-lo." };
  }

  revalidarQuadro();
  return { sucesso: true };
}
