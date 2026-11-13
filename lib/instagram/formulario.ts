// Estado do editor de automação (/admin/instagram/automacoes) e conversões
// puras de/para o payload das actions. Sem React, sem Supabase.
import { TEXTOS_PADRAO } from "@/lib/instagram/textos-padrao";
import type { AutomacaoInput } from "@/lib/validations/instagram";
import type { Alvo } from "@/lib/instagram/tipos";

type AutomacaoParaEditar = {
  id: string;
  nome: string;
  alvo: Alvo;
  midiaId: string | null;
  midiaPermalink: string | null;
  midiaThumb: string | null;
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
};

export type FormularioAutomacao = {
  id?: string;
  nome: string;
  alvo: Alvo;
  midiaId: string | null;
  midiaPermalink: string | null;
  midiaThumb: string | null;
  /** Texto cru do campo ("Avaliar, simular"); só vale com qualquerPalavra = false. */
  palavrasTexto: string;
  qualquerPalavra: boolean;
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
};

export function automacaoNova(): FormularioAutomacao {
  return {
    nome: "",
    alvo: "especifica",
    midiaId: null,
    midiaPermalink: null,
    midiaThumb: null,
    palavrasTexto: "",
    qualquerPalavra: false,
    responderPublico: true,
    frasesPublicas: ["Obrigado! Por favor, veja as DMs.", "Te enviei uma mensagem! Dá uma olhada."],
    dm1Texto: "",
    dm1Botao: "",
    exigirSeguir: false,
    seguirTexto: TEXTOS_PADRAO.seguirTexto,
    seguirBotao: TEXTOS_PADRAO.seguirBotao,
    seguirInsisteTexto: TEXTOS_PADRAO.seguirInsisteTexto,
    linkTexto: "",
    linkBotao: "",
    linkUrl: "",
    lembreteAtivo: true,
    lembreteHoras: 2,
    lembreteTexto: TEXTOS_PADRAO.lembreteTexto,
    retomadaBotaoTexto: TEXTOS_PADRAO.retomadaBotaoTexto,
    retomadaSeguirTexto: TEXTOS_PADRAO.retomadaSeguirTexto,
    retomadaLinkTexto: TEXTOS_PADRAO.retomadaLinkTexto,
  };
}

export function automacaoParaFormulario(a: AutomacaoParaEditar): FormularioAutomacao {
  return {
    id: a.id,
    nome: a.nome,
    alvo: a.alvo,
    midiaId: a.midiaId,
    midiaPermalink: a.midiaPermalink,
    midiaThumb: a.midiaThumb,
    palavrasTexto: a.palavras ? a.palavras.join(", ") : "",
    qualquerPalavra: a.palavras === null,
    responderPublico: a.responderPublico,
    frasesPublicas: a.frasesPublicas,
    dm1Texto: a.dm1Texto,
    dm1Botao: a.dm1Botao,
    exigirSeguir: a.exigirSeguir,
    seguirTexto: a.seguirTexto,
    seguirBotao: a.seguirBotao,
    seguirInsisteTexto: a.seguirInsisteTexto,
    linkTexto: a.linkTexto,
    linkBotao: a.linkBotao,
    linkUrl: a.linkUrl,
    lembreteAtivo: a.lembreteAtivo,
    lembreteHoras: a.lembreteHoras,
    lembreteTexto: a.lembreteTexto,
    retomadaBotaoTexto: a.retomadaBotaoTexto,
    retomadaSeguirTexto: a.retomadaSeguirTexto,
    retomadaLinkTexto: a.retomadaLinkTexto,
  };
}

/** "Avaliar, simular , " -> ["Avaliar", "simular"]. */
export function palavrasDoTexto(texto: string): string[] {
  return texto
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function formularioParaPayload(f: FormularioAutomacao): AutomacaoInput {
  const especifica = f.alvo === "especifica";
  return {
    ...(f.id !== undefined ? { id: f.id } : {}),
    nome: f.nome,
    alvo: f.alvo,
    midiaId: especifica ? f.midiaId : null,
    midiaPermalink: especifica ? f.midiaPermalink : null,
    midiaThumb: especifica ? f.midiaThumb : null,
    palavras: f.qualquerPalavra ? null : palavrasDoTexto(f.palavrasTexto),
    responderPublico: f.responderPublico,
    frasesPublicas: f.frasesPublicas.map((s) => s.trim()).filter((s) => s.length > 0),
    dm1Texto: f.dm1Texto,
    dm1Botao: f.dm1Botao,
    exigirSeguir: f.exigirSeguir,
    seguirTexto: f.seguirTexto,
    seguirBotao: f.seguirBotao,
    seguirInsisteTexto: f.seguirInsisteTexto,
    linkTexto: f.linkTexto,
    linkBotao: f.linkBotao,
    linkUrl: f.linkUrl,
    lembreteAtivo: f.lembreteAtivo,
    lembreteHoras: f.lembreteHoras,
    lembreteTexto: f.lembreteTexto,
    retomadaBotaoTexto: f.retomadaBotaoTexto,
    retomadaSeguirTexto: f.retomadaSeguirTexto,
    retomadaLinkTexto: f.retomadaLinkTexto,
  };
}
