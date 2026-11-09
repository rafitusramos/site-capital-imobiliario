import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { etapaPorSlug } from "@/lib/crm/etapas";
import type { Database, LeadEtapaSlug, LeadTipoSlug } from "@/types/database";
import { emailerDoAmbiente, type Emailer, type ResultadoEnvio } from "./enviar";
import type { CampoEmail, EmailPronto } from "./templates/base";
import { etapaAdmin } from "./templates/etapa-admin";
import { etapaLead } from "./templates/etapa-lead";
import { novoLeadAdmin } from "./templates/novo-lead-admin";
import { novoLeadLead } from "./templates/novo-lead-lead";
import { simulacaoLead } from "./templates/simulacao-lead";

/**
 * Orquestra os e-mails de lead (Fase 5) e grava cada tentativa em crm_emails.
 * Usa o cliente service role: crm_emails não tem policy de escrita para
 * `authenticated` (migration 025), e quem dispara o envio (visitante anônimo
 * no formulário; corretor no quadro) não é quem pode escrever o log.
 *
 * Nada aqui lança. Um e-mail que falha nunca pode afetar a criação do lead
 * nem a movimentação de etapa — os pontos de entrada exportados no fim do
 * arquivo engolem (e registram) qualquer exceção.
 */

/** Janela entre mover o lead e avisá-lo. Mover de novo dentro dela cancela o aviso. */
export const ATRASO_EMAIL_LEAD_MS = 10 * 60 * 1000;

export interface DependenciasEmail {
  admin: SupabaseClient<Database>;
  emailer: Emailer;
  /** Destino dos avisos ao dono (EMAIL_ADMIN). */
  emailAdmin: string | undefined;
  agora: () => Date;
}

export interface LeadParaEmail {
  id: string;
  tipo: LeadTipoSlug;
  nome: string;
  email: string;
  telefone: string;
  protocolo: string;
}

type TipoEmail = Database["public"]["Tables"]["crm_emails"]["Row"]["tipo"];

async function registrar(
  deps: DependenciasEmail,
  linha: Database["public"]["Tables"]["crm_emails"]["Insert"],
): Promise<void> {
  const { error } = await deps.admin.from("crm_emails").insert(linha);
  if (error) console.error("[email] não foi possível registrar em crm_emails:", error);
}

function statusDoEnvio(r: ResultadoEnvio, agendado: boolean) {
  if (r.enviado) {
    return { status: agendado ? ("agendado" as const) : ("enviado" as const), resend_id: r.id, erro: null };
  }
  if (r.motivo === "sem-chave") return { status: "sem-chave" as const, resend_id: null, erro: null };
  return { status: "falhou" as const, resend_id: null, erro: r.erro };
}

async function enviarERegistrar(
  deps: DependenciasEmail,
  base: { lead_id: string; destinatario: string; tipo: TipoEmail; etapa?: string },
  email: EmailPronto,
  agendarPara?: Date,
): Promise<void> {
  const resultado = await deps.emailer.enviar({
    para: base.destinatario,
    assunto: email.assunto,
    html: email.html,
    texto: email.texto,
    ...(agendarPara ? { agendarPara } : {}),
  });
  await registrar(deps, {
    ...base,
    etapa: base.etapa ?? null,
    agendado_para: agendarPara && resultado.enviado ? agendarPara.toISOString() : null,
    ...statusDoEnvio(resultado, Boolean(agendarPara)),
  });
}

async function avisarDono(
  deps: DependenciasEmail,
  leadId: string,
  tipo: TipoEmail,
  email: EmailPronto,
  etapa?: string,
): Promise<void> {
  if (!deps.emailAdmin) {
    console.error("[email] EMAIL_ADMIN ausente: aviso ao dono não enviado.");
    await registrar(deps, {
      lead_id: leadId,
      destinatario: "",
      tipo,
      etapa: etapa ?? null,
      status: "falhou",
      erro: "EMAIL_ADMIN ausente",
    });
    return;
  }
  await enviarERegistrar(deps, { lead_id: leadId, destinatario: deps.emailAdmin, tipo, etapa }, email);
}

export async function notificarNovoLead(
  deps: DependenciasEmail,
  lead: LeadParaEmail,
  campos: CampoEmail[],
): Promise<void> {
  await avisarDono(
    deps,
    lead.id,
    "novo-lead-admin",
    novoLeadAdmin({
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      origem: lead.tipo,
      protocolo: lead.protocolo,
      campos,
    }),
  );
  await enviarERegistrar(
    deps,
    { lead_id: lead.id, destinatario: lead.email, tipo: "novo-lead-lead" },
    novoLeadLead({ nome: lead.nome, origem: lead.tipo, protocolo: lead.protocolo }),
  );
}

/**
 * Cancela os avisos ao lead ainda pendentes. Só os que ainda não chegaram no
 * horário: depois dele o Resend já enviou, e a linha continua 'agendado' (o
 * log não recebe webhook). Se o Resend recusar o cancelamento, a linha não é
 * marcada como cancelada — o log não pode afirmar o que não aconteceu.
 */
export async function cancelarAgendados(deps: DependenciasEmail, leadId: string): Promise<void> {
  const { data, error } = await deps.admin
    .from("crm_emails")
    .select("id, resend_id, agendado_para")
    .eq("lead_id", leadId)
    .eq("tipo", "etapa-lead")
    .eq("status", "agendado");
  if (error) {
    console.error("[email] não foi possível listar e-mails agendados:", error);
    return;
  }

  const agora = deps.agora().getTime();
  for (const linha of data ?? []) {
    if (!linha.resend_id || !linha.agendado_para) continue;
    if (new Date(linha.agendado_para).getTime() <= agora) continue;
    const r = await deps.emailer.cancelar(linha.resend_id);
    if (!r.cancelado) continue;
    const { error: erroUpdate } = await deps.admin.from("crm_emails").update({ status: "cancelado" }).eq("id", linha.id);
    if (erroUpdate) console.error("[email] cancelado no Resend, mas o log não atualizou:", erroUpdate);
  }
}

export interface MudancaDeEtapa {
  lead: LeadParaEmail;
  de: LeadEtapaSlug;
  para: LeadEtapaSlug;
  motivo?: string;
  motivoObs?: string;
  quemMoveu: string;
  /**
   * Suprime SÓ o aviso ao lead (`etapa-lead`). O e-mail ao dono e o
   * cancelamento dos agendados continuam. Usado quando a simulação foi
   * enviada junto com o movimento: o lead já recebe a simulação.
   */
  suprimirAvisoLead?: boolean;
}

async function textoDoMotivo(deps: DependenciasEmail, m: MudancaDeEtapa): Promise<string | undefined> {
  let label: string | undefined;
  if (m.motivo) {
    const { data } = await deps.admin.from("crm_motivos_perda").select("label").eq("slug", m.motivo).maybeSingle();
    label = data?.label ?? m.motivo;
  }
  const partes = [label, m.motivoObs?.trim()].filter(Boolean);
  return partes.length ? partes.join(" — ") : undefined;
}

export async function notificarMudancaEtapa(deps: DependenciasEmail, m: MudancaDeEtapa): Promise<void> {
  // Primeiro cancela: mover de novo dentro da janela (inclusive o "desfazer"
  // do quadro) anula o aviso anterior, seja qual for a etapa de destino.
  await cancelarAgendados(deps, m.lead.id);

  const rotulo = (slug: LeadEtapaSlug) => etapaPorSlug(m.lead.tipo, slug)?.label ?? slug;
  await avisarDono(
    deps,
    m.lead.id,
    "etapa-admin",
    etapaAdmin({
      nome: m.lead.nome,
      protocolo: m.lead.protocolo,
      origem: m.lead.tipo,
      de: rotulo(m.de),
      para: rotulo(m.para),
      motivo: await textoDoMotivo(deps, m),
      quemMoveu: m.quemMoveu,
    }),
    m.para,
  );

  if (m.suprimirAvisoLead) return;

  const { data: etapa } = await deps.admin
    .from("crm_etapas")
    .select("notifica_lead")
    .eq("tipo", m.lead.tipo)
    .eq("slug", m.para)
    .maybeSingle();
  if (!etapa?.notifica_lead) return;

  const email = etapaLead({ nome: m.lead.nome, origem: m.lead.tipo, etapa: m.para, protocolo: m.lead.protocolo });
  if (!email) return;

  const quando = new Date(deps.agora().getTime() + ATRASO_EMAIL_LEAD_MS);
  await enviarERegistrar(
    deps,
    { lead_id: m.lead.id, destinatario: m.lead.email, tipo: "etapa-lead", etapa: m.para },
    email,
    quando,
  );
}

export interface ResultadoEmailSimulacao {
  status: "enviado" | "falhou" | "sem-chave";
  resendId: string | null;
  erro: string | null;
}

/**
 * Envia a simulação (PDF em anexo) ao lead, na hora. Cancela antes os avisos
 * `etapa-lead` ainda pendentes, para o lead não receber dois e-mails. Registra a
 * tentativa em crm_emails (tipo `simulacao`) e devolve o resultado, que a rota
 * usa para gravar crm_simulacoes. Nunca lança.
 */
export async function enviarSimulacaoAoLead(
  deps: DependenciasEmail,
  lead: LeadParaEmail,
  pdf: Uint8Array,
  nomeArquivo: string,
): Promise<ResultadoEmailSimulacao> {
  await cancelarAgendados(deps, lead.id);
  const email = simulacaoLead({ nome: lead.nome, protocolo: lead.protocolo });
  const resultado = await deps.emailer.enviar({
    para: lead.email,
    assunto: email.assunto,
    html: email.html,
    texto: email.texto,
    anexos: [{ nome: nomeArquivo, conteudo: pdf }],
  });
  const s = statusDoEnvio(resultado, false);
  await registrar(deps, {
    lead_id: lead.id,
    destinatario: lead.email,
    tipo: "simulacao",
    etapa: null,
    agendado_para: null,
    ...s,
  });
  return { status: s.status as ResultadoEmailSimulacao["status"], resendId: s.resend_id, erro: s.erro };
}

// ---------------------------------------------------------------------------
// Pontos de entrada para as server actions: montam as dependências reais e
// nunca lançam.
// ---------------------------------------------------------------------------

function dependenciasDoAmbiente(): DependenciasEmail {
  return {
    admin: createAdminClient(),
    emailer: emailerDoAmbiente(),
    emailAdmin: process.env.EMAIL_ADMIN,
    agora: () => new Date(),
  };
}

/** Dependências reais (service role, Resend, EMAIL_ADMIN) para a rota da simulação. */
export function dependenciasEmailDoAmbiente(): DependenciasEmail {
  return dependenciasDoAmbiente();
}

export async function dispararAvisosNovoLead(lead: LeadParaEmail, campos: CampoEmail[]): Promise<void> {
  try {
    await notificarNovoLead(dependenciasDoAmbiente(), lead, campos);
  } catch (e) {
    console.error("[email] falha nos avisos de novo lead:", e);
  }
}

export async function dispararAvisosMudancaEtapa(m: MudancaDeEtapa): Promise<void> {
  try {
    await notificarMudancaEtapa(dependenciasDoAmbiente(), m);
  } catch (e) {
    console.error("[email] falha nos avisos de mudança de etapa:", e);
  }
}
