import { mascaraMoeda } from "@/lib/mascaras";
import type { ImovelComColecoesAdmin } from "@/lib/queries/admin-imoveis";
import type { ImovelFaseOpcao, ImovelTipoOpcao } from "@/lib/queries/imoveis";
import type { SalvarImovelInput } from "@/app/actions/admin-imoveis";
import type { ImovelCapaOrigem, ImovelModalidade } from "@/types/database";

// Ponte entre o formulário do admin (tudo string) e o payload que
// `salvarImovel` valida. Fica fora do componente para ser testável e para o
// ImovelEditor não precisar carregar a lógica das duas modalidades.

export function paraNumeroOuNull(valor: string): number | null {
  const t = valor.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

/**
 * Campos monetários do cadastro. Diferente de `paraNumeroOuNull`, lê só os
 * dígitos — assim o texto mascarado ("R$ 445.000") volta a ser 445000 — e
 * devolve null quando não sobra dígito nenhum (campo apagado), em vez de 0.
 */
export function paraMoedaOuNull(valor: string): number | null {
  const digitos = valor.replace(/\D/g, "");
  return digitos === "" ? null : Number(digitos);
}

/** Número do banco -> texto mascarado do input. Os preços aqui são reais inteiros. */
export function moedaParaCampo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return mascaraMoeda(String(Math.round(valor)));
}

export function paraInteiro(valor: string, padrao = 0): number {
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? padrao : n;
}

/** "" = não informado; vira `null` no banco (a ficha omite a linha). */
export type OpcaoMobiliado = "" | "sim" | "nao";

export type ValoresDados = {
  titulo: string;
  slug: string;
  tipo_id: string;
  fase_id: string;
  bairro: string;
  cidade: string;
  estado: string;
  endereco: string;
  cep: string;
  // Lançamento
  area_min: string;
  area_max: string;
  dormitorios_min: string;
  dormitorios_max: string;
  banheiros_min: string;
  banheiros_max: string;
  vagas_min: string;
  vagas_max: string;
  valor_a_partir_de: string;
  previsao_entrega: string;
  construtora: string;
  construtora_logo_url: string;
  descricao_unidades: string;
  // Pronto (unidade única)
  area_util: string;
  area_total: string;
  dormitorios: string;
  suites: string;
  banheiros: string;
  vagas: string;
  valor_venda: string;
  valor_condominio: string;
  valor_iptu: string;
  nome_condominio: string;
  descricao_unidade: string;
  andar: string;
  mobiliado: OpcaoMobiliado;
  ano_construcao: string;
  exibir_endereco: boolean;
  capa_origem: ImovelCapaOrigem;
  // Comuns
  valor_sob_consulta: boolean;
  video_youtube_url: string;
  video_data_publicacao: string;
  descricao_breve: string;
  descricao_completa: string;
  seo_title: string;
  seo_description: string;
  ordem: string;
};

/**
 * Empreendimento novo (imovel === null) nasce com tipo "Apartamento" e fase
 * "Lançamento" pré-selecionados, quando essas opções existem. Se a opção não
 * existir mais (desativada), cai para a primeira da lista.
 */
function idPadrao(opcoes: { id: string; slug: string }[], slugPreferido: string): string {
  return opcoes.find((opcao) => opcao.slug === slugPreferido)?.id ?? opcoes[0]?.id ?? "";
}

function mobiliadoParaCampo(valor: boolean | null | undefined): OpcaoMobiliado {
  if (valor === true) return "sim";
  if (valor === false) return "nao";
  return "";
}

export function valoresIniciaisDados(
  imovel: ImovelComColecoesAdmin | null,
  tipos: ImovelTipoOpcao[],
  fases: ImovelFaseOpcao[],
): ValoresDados {
  return {
    titulo: imovel?.titulo ?? "",
    slug: imovel?.slug ?? "",
    tipo_id: imovel?.tipo_id ?? idPadrao(tipos, "apartamento"),
    fase_id: imovel?.fase_id ?? idPadrao(fases, "lancamento"),
    bairro: imovel?.bairro ?? "",
    cidade: imovel?.cidade ?? "",
    estado: imovel?.estado ?? "",
    endereco: imovel?.endereco ?? "",
    cep: imovel?.cep ?? "",
    area_min: imovel?.area_min?.toString() ?? "",
    area_max: imovel?.area_max?.toString() ?? "",
    dormitorios_min: imovel?.dormitorios_min?.toString() ?? "",
    dormitorios_max: imovel?.dormitorios_max?.toString() ?? "",
    banheiros_min: imovel?.banheiros_min?.toString() ?? "",
    banheiros_max: imovel?.banheiros_max?.toString() ?? "",
    vagas_min: imovel?.vagas_min?.toString() ?? "",
    vagas_max: imovel?.vagas_max?.toString() ?? "",
    valor_a_partir_de: moedaParaCampo(imovel?.valor_a_partir_de),
    previsao_entrega: imovel?.previsao_entrega ?? "",
    construtora: imovel?.construtora ?? "",
    construtora_logo_url: imovel?.construtora_logo_url ?? "",
    descricao_unidades: imovel?.descricao_unidades ?? "",
    area_util: imovel?.area_util?.toString() ?? "",
    area_total: imovel?.area_total?.toString() ?? "",
    dormitorios: imovel?.dormitorios?.toString() ?? "",
    suites: imovel?.suites?.toString() ?? "",
    banheiros: imovel?.banheiros?.toString() ?? "",
    vagas: imovel?.vagas?.toString() ?? "",
    valor_venda: moedaParaCampo(imovel?.valor_venda),
    valor_condominio: moedaParaCampo(imovel?.valor_condominio),
    valor_iptu: moedaParaCampo(imovel?.valor_iptu),
    nome_condominio: imovel?.nome_condominio ?? "",
    descricao_unidade: imovel?.descricao_unidade ?? "",
    andar: imovel?.andar?.toString() ?? "",
    mobiliado: mobiliadoParaCampo(imovel?.mobiliado),
    ano_construcao: imovel?.ano_construcao?.toString() ?? "",
    exibir_endereco: imovel?.exibir_endereco ?? false,
    capa_origem: imovel?.capa_origem ?? "unidade",
    valor_sob_consulta: imovel?.valor_sob_consulta ?? false,
    video_youtube_url: imovel?.video_youtube_url ?? "",
    video_data_publicacao: imovel?.video_data_publicacao ?? "",
    descricao_breve: imovel?.descricao_breve ?? "",
    descricao_completa: imovel?.descricao_completa ?? "",
    seo_title: imovel?.seo_title ?? "",
    seo_description: imovel?.seo_description ?? "",
    ordem: imovel?.ordem?.toString() ?? "0",
  };
}

/**
 * Payload de `salvarImovel`. Só leva os campos da modalidade: os da outra não
 * existem no schema do servidor e seriam descartados, então nem saem daqui.
 * Toda chave numérica opcional vai presente (null), exigência do schema.
 */
export function montarPayloadImovel(
  v: ValoresDados,
  modalidade: ImovelModalidade,
  id: string | undefined,
): SalvarImovelInput {
  const comuns = {
    id,
    titulo: v.titulo,
    slug: v.slug,
    tipo_id: v.tipo_id,
    bairro: v.bairro,
    cidade: v.cidade,
    estado: v.estado,
    endereco: v.endereco,
    cep: v.cep,
    valor_sob_consulta: v.valor_sob_consulta,
    video_youtube_url: v.video_youtube_url,
    video_data_publicacao: v.video_data_publicacao,
    descricao_breve: v.descricao_breve,
    descricao_completa: v.descricao_completa,
    seo_title: v.seo_title,
    seo_description: v.seo_description,
    ordem: paraInteiro(v.ordem, 0),
  };

  if (modalidade === "pronto") {
    return {
      ...comuns,
      modalidade: "pronto",
      // O servidor define a fase "pronto" (e o trigger da 026 garante).
      fase_id: "",
      area_util: paraNumeroOuNull(v.area_util),
      area_total: paraNumeroOuNull(v.area_total),
      dormitorios: paraNumeroOuNull(v.dormitorios),
      suites: paraNumeroOuNull(v.suites),
      banheiros: paraNumeroOuNull(v.banheiros),
      vagas: paraNumeroOuNull(v.vagas),
      valor_venda: paraMoedaOuNull(v.valor_venda),
      valor_condominio: paraMoedaOuNull(v.valor_condominio),
      valor_iptu: paraMoedaOuNull(v.valor_iptu),
      nome_condominio: v.nome_condominio,
      descricao_unidade: v.descricao_unidade,
      andar: paraNumeroOuNull(v.andar),
      mobiliado: v.mobiliado === "sim" ? true : v.mobiliado === "nao" ? false : null,
      ano_construcao: paraNumeroOuNull(v.ano_construcao),
      exibir_endereco: v.exibir_endereco,
      capa_origem: v.capa_origem,
    };
  }

  return {
    ...comuns,
    modalidade: "lancamento",
    fase_id: v.fase_id,
    area_min: paraNumeroOuNull(v.area_min),
    area_max: paraNumeroOuNull(v.area_max),
    dormitorios_min: paraNumeroOuNull(v.dormitorios_min),
    dormitorios_max: paraNumeroOuNull(v.dormitorios_max),
    banheiros_min: paraNumeroOuNull(v.banheiros_min),
    banheiros_max: paraNumeroOuNull(v.banheiros_max),
    vagas_min: paraNumeroOuNull(v.vagas_min),
    vagas_max: paraNumeroOuNull(v.vagas_max),
    valor_a_partir_de: paraMoedaOuNull(v.valor_a_partir_de),
    previsao_entrega: v.previsao_entrega,
    construtora: v.construtora,
    construtora_logo_url: v.construtora_logo_url,
    descricao_unidades: v.descricao_unidades,
  };
}
