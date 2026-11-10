import { layoutHtml, paragrafoHtml, primeiroNome, RODAPE_LEAD, tabelaHtml, type EmailPronto } from "./base";

export interface SimulacaoLeadInput {
  nome: string;
  protocolo: string;
}

/**
 * E-mail que acompanha o PDF da simulação. Curto de propósito: a informação
 * está no anexo. Tom neutro; a simulação é ilustrativa e nunca se promete
 * aprovação de crédito (quem aprova é a instituição financeira).
 */
export function simulacaoLead(i: SimulacaoLeadInput): EmailPronto {
  const assunto = `Sua simulação de financiamento (${i.protocolo})`;
  const abertura = `Olá, ${primeiroNome(i.nome)}.`;
  const corpo = [
    "Segue em anexo, em PDF, a simulação de financiamento que preparamos com base nas informações que você enviou.",
    "É uma simulação ilustrativa, sem valor de proposta: taxas, parcelas e seguros podem mudar após a análise de crédito feita por cada instituição financeira.",
    "Rafael entrará em contato para conversar sobre os próximos passos. Se preferir, é só responder a este e-mail.",
  ];
  const html = layoutHtml(
    assunto,
    [abertura, ...corpo].map(paragrafoHtml).join("") + tabelaHtml([{ rotulo: "Protocolo", valor: i.protocolo }]),
    RODAPE_LEAD,
  );
  const texto = [abertura, "", ...corpo, "", `Protocolo: ${i.protocolo}`, "", RODAPE_LEAD].join("\n");
  return { assunto, html, texto };
}
