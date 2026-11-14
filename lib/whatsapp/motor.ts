// Motor do atendimento por WhatsApp (spec §7). Orquestra as decisões sobre duas
// dependências injetáveis: o repositório (Supabase) e o cliente da Cloud API.
// Nada aqui conhece Supabase nem fetch.

import { ATRASO_EMAIL_LEAD_MS } from "@/lib/email/notificar";
import { primeiroNome } from "@/lib/email/templates/base";
import { proximaTentativa } from "@/lib/instagram/fila";
import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";
import type { CloudWa } from "./cloud";
import { ehTemporarioWa, motivoLegivelWa } from "./erros";
import type { EventoWa, StatusWa } from "./eventos";
import { linkDoNumeroOficial, respostaFixa } from "./mensagens";
import { waIdDoTelefone, variantesDoWaId } from "./telefone";
import { payloadDeTemplate, TEMPLATES, templateDaEtapa, templateDeConfirmacao } from "./templates";

const HORA_MS = 3600_000;
/** Resposta automática fixa: no máximo uma por contato nesta janela. */
const INTERVALO_RESPOSTA_FIXA_MS = 12 * HORA_MS;
const ROTULO_SEM_TEXTO = "[áudio/imagem/outro]";

// ---------------------------------------------------------------------------
// Contrato do repositório (implementado em repositorio.ts)
// ---------------------------------------------------------------------------

export interface LeadWa {
  id: string;
  tipo: LeadTipoSlug;
  nome: string;
  telefone: string;
  protocolo: string;
  consentimentoWhatsappEm: string | null;
}

export interface ContatoWa {
  id: string;
  waId: string;
  nomePerfil: string | null;
  leadId: string | null;
  ultimaEntradaEm: string | null;
  respostaFixaEm: string | null;
}

export type MotivoEnvioWa = "confirmacao" | "etapa" | "resposta_fixa";

export interface NovoEnvioWa {
  chave: string;
  contatoId: string;
  leadId: string | null;
  motivo: MotivoEnvioWa;
  etapa?: string | null;
  payload: Record<string, unknown>;
  enviarApos: Date;
}

/** Envio reservado, já com o wa_id do destinatário. */
export interface EnvioWa {
  id: string;
  chave: string;
  contatoId: string;
  waId: string;
  leadId: string | null;
  motivo: MotivoEnvioWa;
  payload: Record<string, unknown>;
  /** Falhas anteriores a esta tentativa. */
  tentativas: number;
}

export type ConclusaoEnvioWa =
  | { estado: "enviado"; metaId: string }
  | { estado: "pendente"; enviarApos: Date; tentativas: number; erro: string }
  | { estado: "falhou"; tentativas: number; erro: string };

export interface NovaMensagemWa {
  contatoId: string;
  direcao: "entrada" | "saida";
  tipo: "texto" | "template" | "botao" | "outro";
  texto: string | null;
  template?: string | null;
  metaId: string | null;
  status?: StatusWa | null;
  erro?: string | null;
  /** Instante da mensagem (entrada: o da Meta). Ausente = agora do banco. */
  criadoEm?: string;
}

export interface AvisoDonoWa {
  /** Só quando o contato é um lead cadastrado (crm_emails exige lead_id). */
  leadId?: string;
  nome: string;
  telefone: string;
  protocolo: string | null;
  texto: string;
}

export interface RepositorioWa {
  contatoPorWaId(variantes: string[]): Promise<ContatoWa | null>;
  /** Upsert por wa_id; renova `ultima_interacao_em`. Só sobrescreve `lead_id`/`nome_perfil`/`ultima_entrada_em` quando informados. */
  garantirContato(
    waId: string,
    dados: { leadId?: string | null; nomePerfil?: string | null; entradaEm?: string | null },
  ): Promise<ContatoWa>;
  /** Lead mais recente, não arquivado, cujo telefone normalizado casa com alguma variante. */
  leadPorWaId(variantes: string[]): Promise<LeadWa | null>;
  /** Devolve só as chaves novas (as já vistas são ignoradas). */
  registrarEventos(linhas: { chave: string; payload: unknown }[]): Promise<string[]>;
  /** Ignora chave repetida. */
  enfileirar(e: NovoEnvioWa): Promise<void>;
  cancelarPendentes(leadId: string, motivo: "etapa"): Promise<void>;
  /** RPC wa_reservar_envios. */
  reservar(limite: number): Promise<EnvioWa[]>;
  concluir(id: string, c: ConclusaoEnvioWa): Promise<void>;
  /** Ignora `metaId` repetido. */
  registrarMensagem(m: NovaMensagemWa): Promise<void>;
  /** Nunca regride (`statusAvanca`); `falhou` sempre grava. */
  atualizarStatus(metaId: string, status: StatusWa, erro: string | null): Promise<void>;
  /** lead_interacoes tipo 'whatsapp', automática (sem autor). */
  registrarInteracaoNoLead(leadId: string, texto: string): Promise<void>;
  marcarRespostaFixa(contatoId: string, em: Date): Promise<void>;
  numeroOficial(): Promise<string | null>;
  tocarUltimoEvento(): Promise<void>;
}

export interface MotorWa {
  agendarConfirmacao(lead: LeadWa): Promise<void>;
  agendarAvisoEtapa(lead: LeadWa, etapa: LeadEtapaSlug): Promise<void>;
  cancelarAvisosEtapa(leadId: string): Promise<void>;
  processarEvento(e: EventoWa): Promise<void>;
  dispararFila(limite: number): Promise<{ enviados: number; falhas: number }>;
}

// ---------------------------------------------------------------------------
// Texto de um payload (para o histórico da conversa)
// ---------------------------------------------------------------------------

function textoDoPayload(payload: Record<string, unknown>): { tipo: "texto" | "template"; texto: string | null; template: string | null } {
  if (payload.type === "text") {
    const corpo = (payload.text as { body?: unknown } | undefined)?.body;
    return { tipo: "texto", texto: typeof corpo === "string" ? corpo : null, template: null };
  }
  const t = payload.template as
    | { name?: string; components?: { parameters?: { text?: string }[] }[] }
    | undefined;
  const nome = t?.name ?? null;
  const modelo = nome ? TEMPLATES[nome] : undefined;
  const params = t?.components?.[0]?.parameters?.map((p) => p.text ?? "") ?? [];
  const texto = modelo
    ? modelo.corpo.replace(/\{\{(\d+)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "")
    : null;
  return { tipo: "template", texto, template: nome };
}

export function criarMotorWa(dep: {
  repo: RepositorioWa;
  cloud: CloudWa;
  avisarDono: (a: AvisoDonoWa) => Promise<void>;
  agora: () => Date;
}): MotorWa {
  const { repo, cloud, avisarDono, agora } = dep;

  async function agendarConfirmacao(lead: LeadWa): Promise<void> {
    if (!lead.consentimentoWhatsappEm) return;
    const waId = waIdDoTelefone(lead.telefone);
    if (!waId) return;
    const contato = await repo.garantirContato(waId, { leadId: lead.id });
    await repo.enfileirar({
      chave: `conf:${lead.id}`,
      contatoId: contato.id,
      leadId: lead.id,
      motivo: "confirmacao",
      payload: payloadDeTemplate(templateDeConfirmacao(lead.tipo), [primeiroNome(lead.nome), lead.protocolo]),
      enviarApos: agora(),
    });
  }

  async function cancelarAvisosEtapa(leadId: string): Promise<void> {
    await repo.cancelarPendentes(leadId, "etapa");
  }

  async function agendarAvisoEtapa(lead: LeadWa, etapa: LeadEtapaSlug): Promise<void> {
    // Sempre cancela o anterior: mover de novo (ou "desfazer") anula o aviso pendente.
    await cancelarAvisosEtapa(lead.id);
    if (!lead.consentimentoWhatsappEm) return;
    const template = templateDaEtapa(lead.tipo, etapa);
    if (!template) return;
    const waId = waIdDoTelefone(lead.telefone);
    if (!waId) return;
    const agoraMs = agora().getTime();
    const contato = await repo.garantirContato(waId, { leadId: lead.id });
    await repo.enfileirar({
      chave: `etapa:${lead.id}:${etapa}:${agoraMs}`,
      contatoId: contato.id,
      leadId: lead.id,
      motivo: "etapa",
      etapa,
      payload: payloadDeTemplate(template, [primeiroNome(lead.nome), lead.protocolo]),
      enviarApos: new Date(agoraMs + ATRASO_EMAIL_LEAD_MS),
    });
  }

  async function processarMensagem(e: Extract<EventoWa, { tipo: "mensagem" }>): Promise<void> {
    const variantes = variantesDoWaId(e.waId);
    const [existente, lead] = await Promise.all([repo.contatoPorWaId(variantes), repo.leadPorWaId(variantes)]);
    const antes = existente;
    // Usa o wa_id que já conhecemos (o do lead, com 9º dígito) para não duplicar contato.
    const contato = await repo.garantirContato(antes?.waId ?? e.waId, {
      leadId: lead?.id ?? null,
      nomePerfil: e.nomePerfil,
      entradaEm: e.em,
    });

    await repo.registrarMensagem({
      contatoId: contato.id,
      direcao: "entrada",
      tipo: e.conteudo === "texto" ? "texto" : e.conteudo === "botao" ? "botao" : "outro",
      texto: e.texto,
      metaId: e.metaId,
      criadoEm: e.em,
    });

    if (lead) {
      await repo.registrarInteracaoNoLead(lead.id, `Mensagem no WhatsApp: ${e.texto ?? ROTULO_SEM_TEXTO}`);
    }

    await avisarDono({
      ...(lead ? { leadId: lead.id } : {}),
      nome: lead?.nome ?? e.nomePerfil ?? e.waId,
      telefone: lead?.telefone ?? e.waId,
      protocolo: lead?.protocolo ?? null,
      texto: e.texto ?? ROTULO_SEM_TEXTO,
    });

    // Resposta fixa: no máximo uma por contato a cada 12 h (a janela de 24 h está aberta pelo cliente).
    const ultima = antes?.respostaFixaEm ? new Date(antes.respostaFixaEm).getTime() : null;
    if (ultima === null || ultima < agora().getTime() - INTERVALO_RESPOSTA_FIXA_MS) {
      const numero = await repo.numeroOficial();
      const link = numero ? linkDoNumeroOficial(numero) : null;
      await repo.enfileirar({
        chave: `fixa:${e.metaId}`,
        contatoId: contato.id,
        leadId: lead?.id ?? null,
        motivo: "resposta_fixa",
        payload: { type: "text", text: { body: respostaFixa(link), preview_url: true } },
        enviarApos: agora(),
      });
      await repo.marcarRespostaFixa(contato.id, agora());
    }
  }

  async function processarEvento(e: EventoWa): Promise<void> {
    if (e.tipo === "status") {
      const erro = e.status === "falhou" && e.erro ? motivoLegivelWa({ status: 0, codigo: e.erro.codigo, mensagem: e.erro.mensagem }) : null;
      await repo.atualizarStatus(e.metaId, e.status, erro);
      return;
    }
    await processarMensagem(e);
  }

  async function processarEnvio(envio: EnvioWa): Promise<"enviado" | "falha"> {
    const r = await cloud.enviar(envio.waId, envio.payload);
    if (r.ok) {
      await repo.concluir(envio.id, { estado: "enviado", metaId: r.metaId });
      try {
        const conteudo = textoDoPayload(envio.payload);
        await repo.registrarMensagem({
          contatoId: envio.contatoId,
          direcao: "saida",
          tipo: conteudo.tipo,
          texto: conteudo.texto,
          template: conteudo.template,
          metaId: r.metaId,
          status: "enviado",
        });
      } catch (ex) {
        console.error("[whatsapp] envio entregue, mas o registro da mensagem falhou", envio.id, ex);
      }
      return "enviado";
    }
    // 200 sem id (status 200) não é temporário (ehTemporarioWa): nunca reenvia.
    const proxima = ehTemporarioWa(r) ? proximaTentativa(envio.tentativas, agora()) : null;
    if (proxima) {
      await repo.concluir(envio.id, {
        estado: "pendente",
        enviarApos: proxima,
        tentativas: envio.tentativas + 1,
        erro: r.mensagem,
      });
    } else {
      await repo.concluir(envio.id, {
        estado: "falhou",
        tentativas: envio.tentativas + 1,
        erro: motivoLegivelWa(r),
      });
    }
    return "falha";
  }

  async function dispararFila(limite: number): Promise<{ enviados: number; falhas: number }> {
    const total = { enviados: 0, falhas: 0 };
    try {
      const envios = await repo.reservar(limite);
      for (const envio of envios) {
        try {
          const r = await processarEnvio(envio);
          if (r === "enviado") total.enviados += 1;
          else total.falhas += 1;
        } catch (ex) {
          console.error("[whatsapp] falha ao processar envio", envio.id, ex);
          total.falhas += 1;
          try {
            const proxima = proximaTentativa(envio.tentativas, agora());
            await repo.concluir(
              envio.id,
              proxima
                ? { estado: "pendente", enviarApos: proxima, tentativas: envio.tentativas + 1, erro: "erro interno" }
                : { estado: "falhou", tentativas: envio.tentativas + 1, erro: "erro interno" },
            );
          } catch (ex2) {
            console.error("[whatsapp] não foi possível devolver o envio à fila", envio.id, ex2);
          }
        }
      }
    } catch (ex) {
      console.error("[whatsapp] dispararFila falhou", ex);
    }
    return total;
  }

  return { agendarConfirmacao, agendarAvisoEtapa, cancelarAvisosEtapa, processarEvento, dispararFila };
}
