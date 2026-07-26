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

const FASE_LABEL: Record<string, string> = {
  pre_lancamento: "Pré-lançamento",
  lancamento: "Lançamento",
  em_construcao: "Em construção",
  pronto: "Pronto para morar",
};

export function formatarFase(fase: string): string {
  return FASE_LABEL[fase] ?? fase;
}

const TIPO_LABEL: Record<string, string> = {
  apartamento: "Apartamento",
  vila: "Vila de casas",
  loteamento: "Loteamento",
};

export function formatarTipo(tipo: string): string {
  return TIPO_LABEL[tipo] ?? tipo;
}

export const ORDEM_FASES = ["pre_lancamento", "lancamento", "em_construcao", "pronto"] as const;
