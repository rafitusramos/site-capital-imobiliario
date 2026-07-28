import { brl } from "@/lib/financeiro";

/** Formata uma faixa numérica genérica: "68 a 142", "68" (só um valor) ou null (nenhum). */
function faixa(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null && max !== min) return `${min} a ${max}`;
  if (min !== null) return `${min}`;
  if (max !== null) return `${max}`;
  return null;
}

export function formatarFaixaArea(min: number | null, max: number | null): string | null {
  const texto = faixa(min, max);
  return texto ? `${texto} m²` : null;
}

export function formatarFaixaDormitorios(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null && max !== min) return `${min} e ${max} dorms`;
  const unico = min ?? max;
  if (unico === null) return null;
  return `${unico} dorm${unico === 1 ? "" : "s"}`;
}

export function formatarFaixaVagas(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null && max !== min) return `${min} a ${max} vagas`;
  const unico = min ?? max;
  if (unico === null) return null;
  return `${unico} vaga${unico === 1 ? "" : "s"}`;
}

export function formatarFaixaBanheiros(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null && max !== min) return `${min} a ${max} banheiros`;
  const unico = min ?? max;
  if (unico === null) return null;
  return `${unico} banheiro${unico === 1 ? "" : "s"}`;
}

export function formatarPrecoAPartir(valor: number | null): string | null {
  if (valor === null) return null;
  return brl(valor);
}

/**
 * ID do vídeo a partir das formas que o corretor pode colar no cadastro:
 * youtube.com/watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID — ou o ID puro.
 * Retorna null quando não reconhece, e a seção de vídeo some da LP.
 */
export function extrairIdYoutube(url: string | null): string | null {
  if (!url) return null;
  const texto = url.trim();
  if (!texto) return null;

  // ID puro (11 caracteres do padrão do YouTube)
  if (/^[\w-]{11}$/.test(texto)) return texto;

  const padroes = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
  ];
  for (const padrao of padroes) {
    const encontrado = texto.match(padrao);
    if (encontrado) return encontrado[1];
  }
  return null;
}

// Fallback para quando só o slug está disponível (ex.: a timeline de fase da
// LP, que itera ORDEM_FASES sem ter a linha inteira de imovel_fases à mão).
// Preferir sempre `fase.nome`/`tipo.nome`, vindos do banco — ver abaixo.
const FASE_LABEL: Record<string, string> = {
  pre_lancamento: "Pré-lançamento",
  lancamento: "Lançamento",
  em_construcao: "Em construção",
  pronto: "Pronto para morar",
};

const TIPO_LABEL: Record<string, string> = {
  apartamento: "Apartamento",
  studio: "Studio",
  casa: "Casa",
  chacara: "Chácara",
  sitio: "Sítio",
  terreno: "Terreno",
  "predio-comercial": "Prédio Comercial",
  "sala-comercial": "Sala Comercial",
  loja: "Loja",
  galpao: "Galpão",
};

/** Registro de domínio (imovel_tipos/imovel_fases) ou um subconjunto dele. */
type RegistroDominio = { slug: string; nome?: string | null };

function rotuloDominio(
  valor: string | RegistroDominio | null | undefined,
  mapa: Record<string, string>,
): string {
  if (!valor) return "";
  if (typeof valor === "string") return mapa[valor] ?? valor;
  return valor.nome || mapa[valor.slug] || valor.slug;
}

/** Rótulo da fase. Prefere `fase.nome` (banco); aceita o slug puro como fallback. */
export function formatarFase(fase: string | RegistroDominio | null | undefined): string {
  return rotuloDominio(fase, FASE_LABEL);
}

/** Rótulo do tipo. Prefere `tipo.nome` (banco); aceita o slug puro como fallback. */
export function formatarTipo(tipo: string | RegistroDominio | null | undefined): string {
  return rotuloDominio(tipo, TIPO_LABEL);
}

export const ORDEM_FASES = ["pre_lancamento", "lancamento", "em_construcao", "pronto"] as const;
