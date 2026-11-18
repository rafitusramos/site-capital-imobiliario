import { layoutHtml, RODAPE_ADMIN, tabelaHtml, type CampoEmail, type EmailPronto } from "./base";
import { SITE_URL } from "@/lib/site";

export interface WhatsappAdminInput {
  nome: string;
  telefone: string;
  /** Nulo = contato que não é lead cadastrado. */
  protocolo: string | null;
  texto: string;
}

/** Aviso ao dono: um cliente (ou desconhecido) escreveu no WhatsApp oficial. */
export function whatsappAdmin(i: WhatsappAdminInput): EmailPronto {
  const linhas: CampoEmail[] = [
    { rotulo: "Nome", valor: i.nome },
    { rotulo: "Telefone", valor: i.telefone },
    ...(i.protocolo ? [{ rotulo: "Protocolo", valor: i.protocolo }] : []),
    { rotulo: "Mensagem", valor: i.texto },
  ];
  const link = `${SITE_URL}/admin/`;
  const assunto = `WhatsApp: ${i.nome} respondeu`;
  const html = layoutHtml("Nova mensagem no WhatsApp", tabelaHtml(linhas), RODAPE_ADMIN);
  const texto = ["Nova mensagem no WhatsApp", "", ...linhas.map((l) => `${l.rotulo}: ${l.valor}`), "", link].join("\n");
  return { assunto, html, texto };
}
