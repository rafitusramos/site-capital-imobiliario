import type { ValoresDados } from "@/lib/imoveis/formulario";

// Classes e contrato compartilhados pelos blocos de campos do ImovelEditor.
export const CAMPO =
  "mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
export const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";

export type SetCampo = <K extends keyof ValoresDados>(campo: K, valor: ValoresDados[K]) => void;

export type CamposProps = {
  valores: ValoresDados;
  setCampo: SetCampo;
};
