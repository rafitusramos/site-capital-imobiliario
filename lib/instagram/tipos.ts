// Tipos do módulo comentário -> DM do Instagram. Espelham as tabelas
// ig_automacoes e ig_participacoes (migration 035), em camelCase.

export type Situacao =
  | "aguardando_botao"
  | "aguardando_seguir"
  | "link_enviado"
  | "link_aberto";

export type Alvo = "especifica" | "qualquer" | "proxima";

export interface Automacao {
  id: string;
  nome: string;
  slug: string;
  ativa: boolean;
  alvo: Alvo;
  midiaId: string | null;
  proximaDesde: string | null;
  /** null = qualquer palavra */
  palavras: string[] | null;
  responderPublico: boolean;
  frasesPublicas: string[];
  dm1Texto: string;
  dm1Botao: string;
  exigirSeguir: boolean;
  seguirTexto: string;
  seguirBotao: string;
  seguirInsisteTexto: string;
  linkTexto: string;
  linkBotao: string;
  linkUrl: string;
  lembreteAtivo: boolean;
  lembreteHoras: number;
  lembreteTexto: string;
  retomadaBotaoTexto: string;
  retomadaSeguirTexto: string;
  retomadaLinkTexto: string;
  /** ISO */
  criadoEm: string;
}

export interface Participacao {
  id: string;
  contatoId: string;
  automacaoId: string;
  midiaId: string;
  situacao: Situacao;
  comentarios: number;
  codigo: string;
  janelaAte: string | null;
}

export type Botao =
  | { tipo: "postback"; titulo: string; payload: string }
  | { tipo: "link"; titulo: string; url: string };

export interface MensagemSaida {
  texto: string;
  botao: Botao;
}
