import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

/**
 * Templates de utilidade do WhatsApp (mensagens iniciadas pela empresa fora da
 * janela de 24 h). O corpo daqui tem de ser IDÊNTICO ao cadastrado no
 * WhatsApp Manager (ver docs/whatsapp-templates.md). Derivam dos textos de
 * `lib/email/templates/etapa-lead.ts`, em tom neutro: nunca prometem aprovação
 * de crédito e não têm tom promocional.
 */
export interface TemplateWa {
  nome: string;
  idioma: "pt_BR";
  /** Corpo com variáveis {{1}}… contíguas. */
  corpo: string;
  parametros: number;
}

function t(nome: string, corpo: string): TemplateWa {
  return { nome, idioma: "pt_BR", corpo, parametros: 2 };
}

export const TEMPLATES: Record<string, TemplateWa> = {
  rt_confirmacao_credito: t(
    "rt_confirmacao_credito",
    "Olá, {{1}}! Recebemos o seu pedido de crédito na RT Capital Imobiliário. Seu protocolo é {{2}}. Entraremos em contato em breve.",
  ),
  rt_confirmacao_imovel: t(
    "rt_confirmacao_imovel",
    "Olá, {{1}}! Recebemos o seu interesse em imóvel na RT Capital Imobiliário. Seu protocolo é {{2}}. Entraremos em contato em breve.",
  ),
  rt_etapa_credito_simulacao: t(
    "rt_etapa_credito_simulacao",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a etapa de simulação. Os valores são estimativas e dependem da análise da instituição financeira.",
  ),
  rt_etapa_credito_pre_aprovacao: t(
    "rt_etapa_credito_pre_aprovacao",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a análise de crédito. A decisão é da instituição financeira e depende do seu perfil e da documentação.",
  ),
  rt_etapa_credito_vistoria: t(
    "rt_etapa_credito_vistoria",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a vistoria do imóvel. Entraremos em contato para combinar os detalhes.",
  ),
  rt_etapa_credito_contrato: t(
    "rt_etapa_credito_contrato",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a etapa de contrato. Vamos conferir com você as condições e os documentos antes da assinatura.",
  ),
  rt_etapa_consorcio_apresentacao: t(
    "rt_etapa_consorcio_apresentacao",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a apresentação das opções de consórcio. Vamos explicar prazos e regras para você comparar com calma.",
  ),
  rt_etapa_consorcio_proposta: t(
    "rt_etapa_consorcio_proposta",
    "Olá, {{1}}! Preparamos a proposta de consórcio do seu atendimento (protocolo {{2}}). Ela traz as condições de adesão para a sua análise.",
  ),
  rt_etapa_consorcio_contrato: t(
    "rt_etapa_consorcio_contrato",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a etapa de contrato. Vamos conferir com você as condições e a documentação antes da assinatura.",
  ),
  rt_etapa_imovel_qualificacao: t(
    "rt_etapa_imovel_qualificacao",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a etapa de qualificação. Estamos conferindo o perfil do imóvel que você procura.",
  ),
  rt_etapa_imovel_visita: t(
    "rt_etapa_imovel_visita",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a visita ao imóvel. Entraremos em contato para combinar data e horário.",
  ),
  rt_etapa_imovel_proposta: t(
    "rt_etapa_imovel_proposta",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a etapa de proposta. Vamos apoiar você na formalização e no acompanhamento da resposta do vendedor.",
  ),
  rt_etapa_imovel_contrato: t(
    "rt_etapa_imovel_contrato",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) avançou para a etapa de contrato. Vamos conferir com você as condições e os documentos antes da assinatura.",
  ),
  rt_etapa_ganho: t(
    "rt_etapa_ganho",
    "Olá, {{1}}! Seu atendimento (protocolo {{2}}) foi concluído. Agradecemos a confiança na RT Capital Imobiliário.",
  ),
};

type Familia = "credito" | "consorcio" | "imovel";

const FAMILIA: Record<LeadTipoSlug, Familia> = {
  financiamento: "credito",
  "home-equity": "credito",
  consorcio: "consorcio",
  imoveis: "imovel",
};

export function templateDeConfirmacao(tipo: LeadTipoSlug): TemplateWa {
  return tipo === "imoveis" ? TEMPLATES.rt_confirmacao_imovel : TEMPLATES.rt_confirmacao_credito;
}

/** null = etapa sem texto ao lead (só e-mail, ou nada). */
export function templateDaEtapa(tipo: LeadTipoSlug, etapa: LeadEtapaSlug): TemplateWa | null {
  if (etapa === "ganho") return TEMPLATES.rt_etapa_ganho;
  const slug = etapa.replace(/-/g, "_");
  return TEMPLATES[`rt_etapa_${FAMILIA[tipo]}_${slug}`] ?? null;
}

/** Corpo do envio à Graph. Aridade errada é erro de programação (o teste trava). */
export function payloadDeTemplate(tpl: TemplateWa, params: string[]): Record<string, unknown> {
  if (params.length !== tpl.parametros) {
    throw new Error(`Template ${tpl.nome} espera ${tpl.parametros} parâmetros, recebeu ${params.length}.`);
  }
  return {
    type: "template",
    template: {
      name: tpl.nome,
      language: { code: tpl.idioma },
      components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
    },
  };
}
