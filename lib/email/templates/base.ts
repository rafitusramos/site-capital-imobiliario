import { SITE_URL } from "@/lib/site";
import type { LeadTipoSlug } from "@/types/database";

/**
 * Peças comuns dos e-mails transacionais. Tudo aqui é puro (sem server-only,
 * sem I/O) para ser testado direto. Paleta = tokens do design system do site
 * (app/admin/admin.css): abissal, marfim, bronze, areia, tinta.
 */

export interface EmailPronto {
  assunto: string;
  html: string;
  texto: string;
}

export interface CampoEmail {
  rotulo: string;
  valor: string;
}

export const ORIGEM_LABEL: Record<LeadTipoSlug, string> = {
  financiamento: "Financiamento",
  "home-equity": "Home Equity",
  consorcio: "Consórcio",
  imoveis: "Imóveis",
};

const COR = {
  abissal: "#0a241c",
  marfim: "#f2efe7",
  bronze: "#8a6c48",
  areia: "#c9bfac",
  tinta: "#171a17",
  branco: "#ffffff",
};

/** Todo dado vindo do visitante entra no HTML por aqui. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function linkQuadro(origem: LeadTipoSlug): string {
  return `${SITE_URL}/admin/crm/${origem}/`;
}

const FONTE = "Archivo, Helvetica, Arial, sans-serif";
const FONTE_TITULO = "'Libre Caslon Display', Georgia, 'Times New Roman', serif";

export function paragrafoHtml(texto: string): string {
  return `<p style="margin:0 0 16px;font:16px/1.6 ${FONTE};color:${COR.tinta};">${escaparHtml(texto)}</p>`;
}

export function tabelaHtml(linhas: CampoEmail[]): string {
  const corpo = linhas
    .map(
      (l) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid ${COR.areia};font:13px/1.4 ${FONTE};color:${COR.bronze};width:38%;vertical-align:top;">${escaparHtml(l.rotulo)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid ${COR.areia};font:15px/1.4 ${FONTE};color:${COR.tinta};vertical-align:top;">${escaparHtml(l.valor)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">${corpo}</table>`;
}

export function botaoHtml(rotulo: string, href: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr>` +
    `<td style="background:${COR.abissal};border-radius:4px;">` +
    `<a href="${escaparHtml(href)}" style="display:inline-block;padding:14px 24px;font:600 15px/1 ${FONTE};color:${COR.marfim};text-decoration:none;">${escaparHtml(rotulo)}</a>` +
    `</td></tr></table>`
  );
}

/** Moldura única: faixa escura com a marca, corpo claro, rodapé discreto. */
export function layoutHtml(titulo: string, corpo: string, rodape: string): string {
  return (
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(titulo)}</title></head>` +
    `<body style="margin:0;padding:0;background:${COR.marfim};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.marfim};"><tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${COR.branco};border-collapse:collapse;">` +
    `<tr><td style="background:${COR.abissal};padding:20px 28px;font:22px/1.2 ${FONTE_TITULO};color:${COR.marfim};">RT Capital Imobili&#225;rio</td></tr>` +
    `<tr><td style="height:3px;background:${COR.bronze};font-size:0;line-height:0;">&nbsp;</td></tr>` +
    `<tr><td style="padding:28px;">` +
    `<h1 style="margin:0 0 20px;font:400 24px/1.25 ${FONTE_TITULO};color:${COR.abissal};">${escaparHtml(titulo)}</h1>` +
    corpo +
    `</td></tr>` +
    `<tr><td style="padding:16px 28px;background:${COR.marfim};font:12px/1.5 ${FONTE};color:${COR.bronze};">${escaparHtml(rodape)}</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

export const RODAPE_LEAD = "RT Capital Imobiliário · rtcapitalimobiliario.com.br · Vinhedo/SP";
export const RODAPE_ADMIN = "Aviso automático do CRM da RT Capital Imobiliário.";

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
