import type { LeadTipoSlug } from "@/types/database";
import {
  botaoHtml,
  layoutHtml,
  linkQuadro,
  ORIGEM_LABEL,
  RODAPE_ADMIN,
  tabelaHtml,
  type CampoEmail,
  type EmailPronto,
} from "./base";

export interface NovoLeadAdminInput {
  nome: string;
  telefone: string;
  email: string;
  origem: LeadTipoSlug;
  protocolo: string;
  campos: CampoEmail[];
}

/** (a) Aviso ao dono: chegou lead novo. */
export function novoLeadAdmin(i: NovoLeadAdminInput): EmailPronto {
  const origem = ORIGEM_LABEL[i.origem];
  const link = linkQuadro(i.origem);
  const contato: CampoEmail[] = [
    { rotulo: "Nome", valor: i.nome },
    { rotulo: "Telefone", valor: i.telefone },
    { rotulo: "E-mail", valor: i.email },
    { rotulo: "Origem", valor: origem },
    { rotulo: "Protocolo", valor: i.protocolo },
  ];

  const assunto = `Novo lead de ${origem}: ${i.nome}`;
  const html = layoutHtml(
    "Novo lead no CRM",
    tabelaHtml(contato) + (i.campos.length ? tabelaHtml(i.campos) : "") + botaoHtml("Abrir o quadro", link),
    RODAPE_ADMIN,
  );
  const texto = [
    "Novo lead no CRM",
    "",
    ...contato.map((c) => `${c.rotulo}: ${c.valor}`),
    ...(i.campos.length ? ["", ...i.campos.map((c) => `${c.rotulo}: ${c.valor}`)] : []),
    "",
    `Abrir o quadro: ${link}`,
  ].join("\n");
  return { assunto, html, texto };
}
