/**
 * Tipos da simulação de financiamento enviada ao lead (docs/crm-spec.md §3.7).
 * Módulo só de tipos: vale no navegador (extração do PDF da Creditas) e no
 * servidor (geração do documento), sem I/O.
 */

/** Um banco da tabela multibanco, já em números. Percentuais em % a.a. (11.6 = 11,6%). */
export interface BancoCreditas {
  nome: string;
  taxa: number;
  cet: number;
  custo_total: number;
  prazo: number;
  indexador: string;
  sistema: string;
  primeira: number;
  ultima: number;
  /** Um valor por item de `meses`; `null` quando o contrato já acabou. */
  parcelas: (number | null)[];
  /** `data:image/png;base64,...` recortado do próprio PDF, ou null. */
  logo: string | null;
}

/** O que sai do PDF da Creditas. A referência do documento é o protocolo do lead, não algo daqui. */
export interface DadosCreditas {
  /** dd/mm/aaaa do "Enviado por Creditas"; vazio quando o PDF não traz. */
  data: string;
  valor_imovel: number;
  valor_financiamento: number;
  renda_media: number | null;
  meses: number[];
  bancos: BancoCreditas[];
}

export interface ConfigSimulacao {
  contato: { email: string; telefone: string; site: string };
  tituloCabecalho: string;
  /** Usa `{cliente}`. */
  saudacao: string;
  clientePadrao: string;
  comprometimentoRenda: number;
  indexadoresComparaveis: string[];
  excluirBancos: string[];
  nomesBancos: Record<string, string>;
  etapaAtual: number;
  etapas: ReadonlyArray<readonly [string, string]>;
}

export interface BancoView extends BancoCreditas {
  comparavel: boolean;
  melhor: boolean;
  /** Classe CSS da coluna: "best", "ip" (fora do comparativo) ou "". */
  cls: string;
  /** "*" nos bancos fora do comparativo. */
  ast: string;
}

export interface EtapaView {
  i: number;
  titulo: string;
  desc: string;
  cls: string;
  tag: string;
}

export interface LegendaView {
  nome: string;
  cor: string;
  w: number;
  estilo: "dashed" | "solid";
}

export interface CelulaEvolucao {
  valor: number | null;
  cls: string;
}

export interface SimulacaoView {
  titulo: string;
  saudacao: string;
  referencia: string;
  data: string;
  contato: ConfigSimulacao["contato"];
  valorImovel: number;
  valorFinanciamento: number;
  entrada: number;
  entradaPct: number;
  rendaMedia: number | null;
  bancos: BancoView[];
  melhor: BancoView;
  pior: BancoView;
  economia: number;
  rendaMinima: number;
  comprometimentoPct: number;
  comparaveisTxt: string;
  fora: BancoView[];
  foraTxt: string;
  foraIdx: string;
  temPrice: boolean;
  graficoSvg: string;
  legenda: LegendaView[];
  etapas: EtapaView[];
  evolucao: { mes: number; celulas: CelulaEvolucao[] }[];
}
