/**
 * Fonte única da verdade dos dados legais do site — usada pela Política de
 * Privacidade, pelos Termos de Uso e pelo checkbox de consentimento dos
 * formulários de lead. Qualquer mudança nesses dados entra aqui, não nos
 * componentes que os consomem.
 */

/** Controlador dos dados, exigido pela LGPD (art. 9º I). */
export const CONTROLADOR = {
  razaoSocial: "Equity Real Estate Soluções Imobiliárias LTDA",
  cnpj: "58.327.825/0001-03",
  endereco: "R VICENTE ROTELLA, 127, SALA 01, SANTA ROSA, VINHEDO, SP, CEP 13289-056",
} as const;

/**
 * Encarregado pelo tratamento de dados, exigido pelo art. 41 da LGPD, que
 * obriga a divulgar a identidade e o contato dele. Numa operação deste porte a
 * ANPD admite que seja o próprio titular do negócio, e é o caso aqui: o
 * encarregado atende pelo EMAIL_LGPD abaixo.
 */
export const ENCARREGADO = "Rafael Ramos Teixeira";

export const EMAIL_LGPD = "contato@rtcapitalimobiliario.com.br";

export const RETENCAO_ANOS = 5;

export const ATUALIZADO_EM = "29 de julho de 2026";

/**
 * Frase exata do checkbox de consentimento nos formulários de lead. A
 * Política de Privacidade cita esta constante textualmente — as duas nunca
 * podem divergir.
 */
export const TEXTO_CONSENTIMENTO =
  "Autorizo o uso dos meus dados, para a pré-qualificação de crédito e o encaminhamento às instituições financeiras parceiras.";
