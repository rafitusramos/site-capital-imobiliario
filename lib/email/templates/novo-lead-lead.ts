import type { LeadTipoSlug } from "@/types/database";
import { layoutHtml, ORIGEM_LABEL, paragrafoHtml, primeiroNome, RODAPE_LEAD, tabelaHtml, type EmailPronto } from "./base";

export interface NovoLeadLeadInput {
  nome: string;
  origem: LeadTipoSlug;
  protocolo: string;
}

/** (b) Confirmação ao lead: transacional, sobre o pedido que ele mesmo fez. */
export function novoLeadLead(i: NovoLeadLeadInput): EmailPronto {
  const nome = primeiroNome(i.nome);
  const assunto = `Recebemos o seu pedido de ${ORIGEM_LABEL[i.origem]}`;
  const paragrafos = [
    `Olá, ${nome}.`,
    "Recebemos as informações que você enviou pelo nosso site. Guarde o número de protocolo abaixo: ele identifica o seu atendimento.",
  ];
  const proximos = [
    "Próximos passos:",
    "1. Um consultor da RT Capital Imobiliário vai analisar as informações enviadas.",
    "2. Em seguida, entraremos em contato pelo telefone ou e-mail informado.",
    "3. Se precisar complementar algum dado, basta responder a este e-mail.",
  ];
  const html = layoutHtml(
    "Recebemos o seu pedido",
    paragrafos.map(paragrafoHtml).join("") +
      tabelaHtml([{ rotulo: "Protocolo", valor: i.protocolo }]) +
      proximos.map(paragrafoHtml).join(""),
    RODAPE_LEAD,
  );
  const texto = [...paragrafos, "", `Protocolo: ${i.protocolo}`, "", ...proximos, "", RODAPE_LEAD].join("\n");
  return { assunto, html, texto };
}
