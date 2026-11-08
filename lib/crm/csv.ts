import { formatarData } from "@/lib/crm/tempo";
import type { LeadQuadroCRM } from "@/lib/queries/admin-crm";

/**
 * Exportação do quadro em CSV (docs/crm-spec.md §3.2). Formato pensado para
 * abrir direto no Excel pt-BR: UTF-8 com BOM (senão "Ã§" no lugar de "ç"),
 * separador `;` (a vírgula é o decimal), decimal com vírgula, CRLF, datas no
 * fuso de São Paulo. Dinheiro sai como número puro, sem "R$" nem milhar,
 * para a planilha somar.
 *
 * Camada pura: recebe as linhas já filtradas e devolve o texto.
 */

export const BOM = "﻿";
const SEPARADOR = ";";
const QUEBRA = "\r\n";

export type Celula = string | number | boolean | null | undefined;

/**
 * Uma célula pronta para o CSV. Texto que começa com `= + - @` (ou tab/CR) é
 * prefixado com apóstrofo: sem isso o Excel executa como fórmula o nome ou a
 * observação que um visitante digitou no formulário do site (CSV injection).
 * Número de verdade (`typeof number`) não passa por esse filtro: -5 é -5.
 */
export function escaparCelula(valor: Celula): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "number") return String(valor).replace(".", ",");

  let texto = valor;
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[;"\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function montarCsv(cabecalho: string[], linhas: Celula[][]): string {
  const todas = [cabecalho, ...linhas];
  return BOM + todas.map((l) => l.map(escaparCelula).join(SEPARADOR)).join(QUEBRA) + QUEBRA;
}

const CABECALHO_QUADRO = [
  "Protocolo",
  "Nome",
  "E-mail",
  "Telefone",
  "Origem",
  "Etapa",
  "Responsável",
  "Valor do negócio",
  "Tags",
  "Favorito",
  "Dias na etapa",
  "Próximo lembrete",
  "Criado em",
  "Atualizado em",
];

/** CSV do quadro como o operador o vê (já filtrado e ordenado). */
export function csvDoQuadro(leads: LeadQuadroCRM[]): string {
  return montarCsv(
    CABECALHO_QUADRO,
    leads.map((l) => [
      l.protocolo,
      l.nome,
      l.email,
      l.telefone,
      l.tipo_label,
      l.etapa_label,
      l.corretor_nome,
      l.valor_negocio,
      l.tags.join(", "),
      l.favorito,
      l.dias_na_etapa,
      l.proximo_lembrete_em ? formatarData(l.proximo_lembrete_em) : null,
      formatarData(l.created_at),
      formatarData(l.updated_at),
    ]),
  );
}
