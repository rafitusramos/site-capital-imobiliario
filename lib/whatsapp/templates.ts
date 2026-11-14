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
    "Olá, {{1}}! 👋\nRecebemos o seu pedido de simulação de crédito na RT Capital Imobiliário.\nSeu protocolo é {{2}}. 📄\nEm até 1 dia útil entraremos em contato.\nPor este número você recebe os avisos do seu atendimento. O Rafael fala com você pelo WhatsApp dele e pelo seu e-mail cadastrado.\nAté breve! 🤝",
  ),
  rt_confirmacao_imovel: t(
    "rt_confirmacao_imovel",
    "Olá, {{1}}! 👋\nRecebemos o seu interesse em um imóvel da RT Capital Imobiliário.\nSeu protocolo é {{2}}. 📄\nEm até 1 dia útil entraremos em contato para entender o que você procura.\nPor este número você recebe os avisos do seu atendimento. O Rafael fala com você pelo WhatsApp dele e pelo seu e-mail cadastrado.\nAté breve! 🤝",
  ),
  rt_etapa_credito_simulacao: t(
    "rt_etapa_credito_simulacao",
    "Olá, {{1}}! 👋\nSeu atendimento avançou para a etapa de simulação. 📊\nProtocolo {{2}}.\nEstamos calculando as condições possíveis. Os valores são estimativas e dependem da análise da instituição financeira.\nAté breve! 🤝",
  ),
  rt_etapa_credito_pre_aprovacao: t(
    "rt_etapa_credito_pre_aprovacao",
    "Olá, {{1}}! 👋\nSeu atendimento avançou para a análise de crédito. 🏦\nProtocolo {{2}}.\nEstamos encaminhando a sua proposta à instituição financeira. A decisão é dela e depende do seu perfil e da documentação. Avisaremos assim que houver retorno.\nAté breve! 🤝",
  ),
  rt_etapa_credito_vistoria: t(
    "rt_etapa_credito_vistoria",
    "Olá, {{1}}! 👋\nSeu atendimento avançou para a vistoria do imóvel. 🏠\nProtocolo {{2}}.\nA instituição financeira vai avaliar o imóvel. Entraremos em contato para combinar os detalhes.\nAté breve! 🤝",
  ),
  rt_etapa_credito_contrato: t(
    "rt_etapa_credito_contrato",
    "Olá, {{1}}! 👋\nSeu atendimento chegou à etapa de contrato. 📝\nProtocolo {{2}}.\nVamos conferir com você as condições e os documentos antes da assinatura. Em caso de dúvida, fale com a gente antes de assinar.\nAté breve! 🤝",
  ),
  rt_etapa_consorcio_apresentacao: t(
    "rt_etapa_consorcio_apresentacao",
    "Olá, {{1}}! 👋\nSeu atendimento avançou para a apresentação das opções de consórcio. 📋\nProtocolo {{2}}.\nVamos explicar prazos e regras de contemplação para você comparar com calma.\nAté breve! 🤝",
  ),
  rt_etapa_consorcio_proposta: t(
    "rt_etapa_consorcio_proposta",
    "Olá, {{1}}! 👋\nA sua proposta de consórcio está pronta. 📄\nProtocolo {{2}}.\nEla traz as condições de adesão para a sua análise. Fique à vontade para tirar dúvidas antes de decidir.\nAté breve! 🤝",
  ),
  rt_etapa_consorcio_contrato: t(
    "rt_etapa_consorcio_contrato",
    "Olá, {{1}}! 👋\nSeu atendimento chegou à etapa de contrato. 📝\nProtocolo {{2}}.\nVamos conferir com você as condições e a documentação antes da assinatura. Em caso de dúvida, fale com a gente antes de assinar.\nAté breve! 🤝",
  ),
  rt_etapa_imovel_qualificacao: t(
    "rt_etapa_imovel_qualificacao",
    "Olá, {{1}}! 👋\nSeu atendimento avançou para a etapa de qualificação. 🔎\nProtocolo {{2}}.\nEstamos entendendo o perfil do imóvel que você procura para indicar as melhores opções.\nAté breve! 🤝",
  ),
  rt_etapa_imovel_visita: t(
    "rt_etapa_imovel_visita",
    "Olá, {{1}}! 👋\nSeu atendimento avançou para a visita ao imóvel. 🏡\nProtocolo {{2}}.\nEntraremos em contato para combinar data e horário.\nAté breve! 🤝",
  ),
  rt_etapa_imovel_proposta: t(
    "rt_etapa_imovel_proposta",
    "Olá, {{1}}! 👋\nSeu atendimento avançou para a etapa de proposta. 📄\nProtocolo {{2}}.\nVamos apoiar você na formalização e no acompanhamento da resposta do vendedor.\nAté breve! 🤝",
  ),
  rt_etapa_imovel_contrato: t(
    "rt_etapa_imovel_contrato",
    "Olá, {{1}}! 👋\nSeu atendimento chegou à etapa de contrato. 📝\nProtocolo {{2}}.\nVamos conferir com você as condições e os documentos antes da assinatura. Em caso de dúvida, fale com a gente antes de assinar.\nAté breve! 🤝",
  ),
  rt_etapa_ganho: t(
    "rt_etapa_ganho",
    "Olá, {{1}}! 👋\nSeu atendimento foi concluído. ✅\nProtocolo {{2}}.\nObrigado pela confiança na RT Capital Imobiliário. Se precisar de algo, é só chamar o Rafael.\nAté logo! 🤝",
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
