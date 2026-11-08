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

export interface EtapaAdminInput {
  nome: string;
  protocolo: string;
  origem: LeadTipoSlug;
  /** Rótulos de exibição, não slugs. */
  de: string;
  para: string;
  motivo?: string;
  quemMoveu: string;
}

/** (c) Aviso ao dono: um lead mudou de etapa. */
export function etapaAdmin(i: EtapaAdminInput): EmailPronto {
  const link = linkQuadro(i.origem);
  const linhas: CampoEmail[] = [
    { rotulo: "Lead", valor: i.nome },
    { rotulo: "Protocolo", valor: i.protocolo },
    { rotulo: "Origem", valor: ORIGEM_LABEL[i.origem] },
    { rotulo: "Etapa", valor: `${i.de} → ${i.para}` },
    ...(i.motivo ? [{ rotulo: "Motivo", valor: i.motivo }] : []),
    { rotulo: "Movido por", valor: i.quemMoveu },
  ];
  const assunto = `${i.nome} foi para ${i.para}`;
  const html = layoutHtml("Mudança de etapa", tabelaHtml(linhas) + botaoHtml("Abrir o quadro", link), RODAPE_ADMIN);
  const texto = ["Mudança de etapa", "", ...linhas.map((l) => `${l.rotulo}: ${l.valor}`), "", `Abrir o quadro: ${link}`].join(
    "\n",
  );
  return { assunto, html, texto };
}
