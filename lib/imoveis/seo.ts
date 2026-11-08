import {
  formatarFaixaArea,
  formatarFaixaDormitorios,
  formatarFaixaVagas,
} from "@/lib/imoveis/formato";
import type { ImovelModalidade } from "@/types/database";

// Texto de descoberta do imóvel: `alt` das imagens e title/description da
// página (docs/handoff-seo-onpage-descoberta.md). Tudo derivado do cadastro,
// para valer em todo imóvel atual e futuro sem ninguém escrever à mão.

/** O mínimo que os textos precisam saber do imóvel — mantém tudo testável. */
export type ImovelParaTexto = {
  titulo: string;
  tipo: { nome: string };
  bairro: string | null;
  cidade: string | null;
};

export type ImovelParaTitulo = ImovelParaTexto & { seo_title: string | null };

export type ImovelParaDescricao = ImovelParaTexto & {
  fase: { nome: string };
  seo_description: string | null;
  descricao_breve: string | null;
  area_min: number | null;
  area_max: number | null;
  dormitorios_min: number | null;
  dormitorios_max: number | null;
  // Unidade única (migration 026). Opcionais: só imóvel pronto preenche.
  modalidade?: ImovelModalidade;
  area_util?: number | null;
  dormitorios?: number | null;
  vagas?: number | null;
};

/**
 * Junta pedaços não vazios com um separador, sem sobrar separador solto quando
 * um pedaço falta. É o que evita "Apartamento Jabô — , Vinhedo".
 */
function juntar(partes: (string | null | undefined)[], separador: string): string {
  return partes.filter((parte): parte is string => Boolean(parte?.trim())).join(separador);
}

/**
 * Colapsa espaço em branco e quebras de linha num espaço só.
 *
 * `seo_description` é textarea no admin, e quebra de linha ali vira quebra
 * literal dentro do atributo `content` da meta — foi o que aconteceu com o
 * Jabô Studio. O HTML continua válido e o navegador não reclama, então o
 * defeito passa despercebido: só aparece lendo o fonte servido.
 */
export function normalizarTexto(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

/**
 * A cidade, ou nada quando o título já a nomeia.
 *
 * Metade dos empreendimentos é cadastrada com a cidade no nome ("Gran VIC
 * Niágara Vinhedo", "Villagio Santanna Vinhedo"), e sem esta guarda o texto
 * sai gaguejando: "Gran VIC Niágara Vinhedo, Vinhedo".
 */
function cidadeSemRepetir(imovel: ImovelParaTexto): string | null {
  if (!imovel.cidade) return null;
  const titulo = imovel.titulo.toLocaleLowerCase("pt-BR");
  const cidade = imovel.cidade.toLocaleLowerCase("pt-BR");
  return titulo.includes(cidade) ? null : imovel.cidade;
}

/** "Marambaia, Vinhedo" — ou só a cidade, ou só o bairro, sem vírgula órfã. */
function local(imovel: ImovelParaTexto): string {
  return juntar([imovel.bairro, cidadeSemRepetir(imovel)], ", ");
}

/**
 * `alt` da imagem principal do imóvel: "Apartamento Gran VIC Niágara —
 * Marambaia, Vinhedo". Cai para o título sozinho se não houver local
 * cadastrado — nunca devolve vazio, porque imagem de conteúdo sem `alt` é
 * imagem que não existe para leitor de tela nem para o Google Imagens.
 */
export function altDoImovel(imovel: ImovelParaTexto): string {
  const nome = juntar([imovel.tipo.nome, imovel.titulo], " ");
  return juntar([nome, local(imovel)], " — ") || imovel.titulo;
}

/**
 * Contexto curto que acompanha as fotos de galeria: "Gran VIC Niágara,
 * Vinhedo". Sem o tipo, que já aparece no `alt` do hero e ficaria repetitivo
 * em cada foto.
 */
export function contextoDoImovel(imovel: ImovelParaTexto): string {
  return juntar([imovel.titulo, cidadeSemRepetir(imovel)], ", ");
}

/**
 * `alt` de foto de galeria: "Sala de estar — Gran VIC Niágara, Vinhedo".
 * Sem ambiente cadastrado sobra o contexto, que ainda descreve a foto melhor
 * que string vazia.
 */
export function altDaImagem(ambiente: string | null, contexto: string): string {
  return juntar([ambiente, contexto], " — ");
}

const MARCA = "RT Capital Imobiliário";

/**
 * `title` da página de imóvel. `seo_title` é campo editorial do admin e manda
 * quando existe — o template não reescreve texto que uma pessoa escolheu. A
 * derivada só cobre a ausência, e é aí que entram tipo e cidade, que é o que
 * uma busca local procura.
 */
export function tituloDoImovel(imovel: ImovelParaTitulo): string {
  if (imovel.seo_title?.trim()) return normalizarTexto(imovel.seo_title);
  const ondeEstá = imovel.cidade ? `à venda em ${imovel.cidade}` : "à venda";
  return `${imovel.titulo} — ${imovel.tipo.nome} ${ondeEstá} | ${MARCA}`;
}

/**
 * `description` da página de imóvel, em três degraus: `seo_description`,
 * `descricao_breve`, e por último uma frase montada do cadastro.
 *
 * O terceiro degrau existe porque os dois primeiros são opcionais no admin: um
 * imóvel cadastrado sem nenhum dos dois saía **sem meta description nenhuma**,
 * e aí quem escreve o resumo do resultado de busca é o Google, com o pedaço de
 * texto que ele achar. Todo degrau passa por `normalizarTexto`.
 */
export function descricaoDoImovel(imovel: ImovelParaDescricao): string {
  const escolhida = imovel.seo_description?.trim() || imovel.descricao_breve?.trim();
  if (escolhida) return normalizarTexto(escolhida);

  // Unidade única fala em valores, não em faixas: "180 m², 3 dorms, 2 vagas".
  // `formatarFaixa*(x, x)` já devolve o valor único, então é o mesmo formatador.
  const pronto = imovel.modalidade === "pronto";
  const area = pronto
    ? formatarFaixaArea(imovel.area_util ?? null, imovel.area_util ?? null)
    : formatarFaixaArea(imovel.area_min, imovel.area_max);
  const dormitorios = pronto
    ? formatarFaixaDormitorios(imovel.dormitorios ?? null, imovel.dormitorios ?? null)
    : formatarFaixaDormitorios(imovel.dormitorios_min, imovel.dormitorios_max);
  const vagas = pronto ? formatarFaixaVagas(imovel.vagas ?? null, imovel.vagas ?? null) : null;
  const ficha = juntar([area, dormitorios, vagas], ", ");
  const onde = local(imovel);

  // Fase "Pronto para morar" não entra: a frase é "à venda", sem flexão de gênero.
  const abertura = juntar(
    [pronto ? `${imovel.tipo.nome} à venda` : `${imovel.tipo.nome} ${imovel.fase.nome}`, onde],
    " em ",
  );
  return normalizarTexto(
    juntar([ficha ? `${abertura}: ${ficha}` : abertura, "Fale com Rafael Teixeira."], ". "),
  );
}
