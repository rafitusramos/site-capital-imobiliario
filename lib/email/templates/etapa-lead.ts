import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";
import { layoutHtml, paragrafoHtml, primeiroNome, RODAPE_LEAD, tabelaHtml, type EmailPronto } from "./base";

export interface EtapaLeadInput {
  nome: string;
  origem: LeadTipoSlug;
  etapa: LeadEtapaSlug;
  protocolo: string;
}

interface TextoEtapa {
  assunto: string;
  corpo: string[];
}

type TextosPipeline = Partial<Record<LeadEtapaSlug, TextoEtapa>>;

/**
 * (d) Um texto por (origem, etapa) positiva. Tom neutro e profissional:
 * descreve o andamento do atendimento e nunca promete aprovação de crédito —
 * quem aprova é a instituição financeira, não a RT. Criado, perdido e
 * não-qualificado não têm texto de propósito (nunca viram e-mail ao lead).
 */
const GANHO: TextoEtapa = {
  assunto: "Atendimento concluído",
  corpo: [
    "Seu atendimento foi concluído.",
    "Agradecemos a confiança na RT Capital Imobiliário. Se precisar de algo depois, é só responder a este e-mail.",
  ],
};

const CREDITO: TextosPipeline = {
  simulacao: {
    assunto: "Seu atendimento avançou: simulação",
    corpo: [
      "Seu atendimento avançou para a etapa de simulação.",
      "Estamos calculando as condições possíveis com base nas informações que você enviou. Os valores apresentados são estimativas e dependem da análise da instituição financeira.",
    ],
  },
  "pre-aprovacao": {
    assunto: "Seu atendimento avançou: análise de crédito",
    corpo: [
      "Seu atendimento avançou para a análise de crédito.",
      "Estamos reunindo a documentação e encaminhando a proposta à instituição financeira. A decisão é dela e depende do seu perfil e da documentação; avisaremos assim que houver retorno.",
    ],
  },
  vistoria: {
    assunto: "Seu atendimento avançou: vistoria do imóvel",
    corpo: [
      "Seu atendimento avançou para a vistoria do imóvel.",
      "A instituição financeira avalia o imóvel oferecido. Entraremos em contato para combinar os detalhes e informar o resultado quando ele estiver disponível.",
    ],
  },
  contrato: {
    assunto: "Seu atendimento avançou: contrato",
    corpo: [
      "Seu atendimento avançou para a etapa de contrato.",
      "Vamos acompanhar com você a conferência das condições e dos documentos antes da assinatura. Em caso de dúvida, fale com a gente antes de assinar.",
    ],
  },
  ganho: GANHO,
};

const TEXTOS: Record<LeadTipoSlug, TextosPipeline> = {
  financiamento: CREDITO,
  "home-equity": CREDITO,
  consorcio: {
    apresentacao: {
      assunto: "Seu atendimento avançou: apresentação das opções",
      corpo: [
        "Seu atendimento avançou para a apresentação das opções de consórcio.",
        "Vamos explicar prazos, parcelas e regras de contemplação para que você compare com calma.",
      ],
    },
    proposta: {
      assunto: "Seu atendimento avançou: proposta de consórcio",
      corpo: [
        "Preparamos a proposta de consórcio com base na conversa que tivemos.",
        "Ela traz as condições de adesão para a sua análise. Fique à vontade para tirar dúvidas antes de decidir.",
      ],
    },
    contrato: {
      assunto: "Seu atendimento avançou: contrato de consórcio",
      corpo: [
        "Seu atendimento avançou para a etapa de contrato.",
        "Vamos conferir com você as condições e a documentação antes da assinatura.",
      ],
    },
    ganho: GANHO,
  },
  imoveis: {
    qualificacao: {
      assunto: "Seu atendimento avançou: entendendo o que você procura",
      corpo: [
        "Seu atendimento avançou para a etapa de qualificação.",
        "Estamos conferindo o perfil do imóvel que você procura para indicar as melhores opções.",
      ],
    },
    visita: {
      assunto: "Seu atendimento avançou: visita ao imóvel",
      corpo: [
        "Seu atendimento avançou para a visita ao imóvel.",
        "Entraremos em contato para combinar data e horário que fiquem bons para você.",
      ],
    },
    proposta: {
      assunto: "Seu atendimento avançou: proposta do imóvel",
      corpo: [
        "Seu atendimento avançou para a etapa de proposta.",
        "Vamos apoiar você na formalização da proposta e no acompanhamento da resposta do vendedor.",
      ],
    },
    contrato: {
      assunto: "Seu atendimento avançou: contrato do imóvel",
      corpo: [
        "Seu atendimento avançou para a etapa de contrato.",
        "Vamos conferir com você as condições e os documentos antes da assinatura.",
      ],
    },
    ganho: GANHO,
  },
};

/** Etapas do pipeline que têm texto ao lead. */
export function etapasComTextoParaLead(origem: LeadTipoSlug): LeadEtapaSlug[] {
  return Object.keys(TEXTOS[origem]) as LeadEtapaSlug[];
}

export function etapaLead(i: EtapaLeadInput): EmailPronto | null {
  const t = TEXTOS[i.origem]?.[i.etapa];
  if (!t) return null;
  const abertura = `Olá, ${primeiroNome(i.nome)}.`;
  const fecho = "Para falar com a gente, responda a este e-mail ou use o telefone do nosso site.";
  const html = layoutHtml(
    t.assunto,
    [abertura, ...t.corpo].map(paragrafoHtml).join("") +
      tabelaHtml([{ rotulo: "Protocolo", valor: i.protocolo }]) +
      paragrafoHtml(fecho),
    RODAPE_LEAD,
  );
  const texto = [abertura, "", ...t.corpo, "", `Protocolo: ${i.protocolo}`, "", fecho, "", RODAPE_LEAD].join("\n");
  return { assunto: t.assunto, html, texto };
}
