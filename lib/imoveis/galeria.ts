import type { ImagemInput } from "@/lib/validations/imovel";
import type { ImovelImagemGrupo } from "@/types/database";

/**
 * Regra de negócio da aba Galeria do editor de imóveis, isolada de React e
 * DOM para ser testável em isolamento (ver tests/unidade/galeria.test.ts).
 *
 * A UI trabalha com a galeria agrupada em 4 seções (`GaleriaAgrupada`); o
 * banco só entende a lista plana (`ImagemInput[]`) com `ordem` e `destaque`.
 * `agruparImagens` faz a ida, `achatarGaleria` faz a volta — e é na volta
 * que `ordem` (índice dentro do grupo) e `destaque` (só a primeira de
 * `empreendimento`) são recalculados. Isso mantém as duas regras num único
 * lugar, em vez de espalhadas pelos handlers de drag da UI.
 */

export const GRUPOS_GALERIA: { id: ImovelImagemGrupo; nome: string; descricao: string }[] = [
  {
    id: "empreendimento",
    nome: "Empreendimento",
    descricao: "Fachada e áreas comuns. A primeira imagem é a capa do site.",
  },
  {
    id: "decorado",
    nome: "Decorado",
    descricao: "Fotos do apartamento decorado, ambiente por ambiente.",
  },
  {
    id: "planta",
    nome: "Plantas",
    descricao: "Plantas baixas das tipologias.",
  },
  {
    id: "implantacao",
    nome: "Implantação",
    descricao: "Vista aérea e mapa de implantação do empreendimento.",
  },
];

/**
 * Genérico em `T` (sempre um subtipo de `ImagemInput`) para servir tanto o
 * `ImagemInput` puro dos testes/da action de salvar, quanto o tipo do
 * componente que acrescenta uma `chaveLocal` estável para o dnd-kit — sem
 * isso, o componente precisaria castar os retornos toda hora para enxergar
 * a própria chave que ele mesmo colocou lá.
 */
export type GaleriaAgrupada<T extends ImagemInput = ImagemInput> = Record<ImovelImagemGrupo, T[]>;

function grupoVazio<T extends ImagemInput>(): GaleriaAgrupada<T> {
  return {
    empreendimento: [],
    decorado: [],
    planta: [],
    implantacao: [],
  };
}

/** Distribui a lista plana nos 4 grupos, preservando a ordem relativa (por `ordem`). */
export function agruparImagens<T extends ImagemInput>(imagens: T[]): GaleriaAgrupada<T> {
  const grupos = grupoVazio<T>();
  const ordenadas = [...imagens].sort((a, b) => a.ordem - b.ordem);
  for (const imagem of ordenadas) {
    grupos[imagem.grupo].push(imagem);
  }
  return grupos;
}

/**
 * Volta para lista plana, na ordem dos grupos de `GRUPOS_GALERIA`.
 * Aqui `ordem` é reatribuída como o índice da imagem dentro do seu grupo, e
 * `destaque` passa a ser `true` só para a primeira imagem de `empreendimento`.
 */
export function achatarGaleria<T extends ImagemInput>(grupos: GaleriaAgrupada<T>): T[] {
  const achatada: T[] = [];
  for (const { id: grupoId } of GRUPOS_GALERIA) {
    grupos[grupoId].forEach((imagem, indice) => {
      achatada.push({
        ...imagem,
        ordem: indice,
        destaque: grupoId === "empreendimento" && indice === 0,
      } as T);
    });
  }
  return achatada;
}

/** Reordena dentro de um único grupo (arrastar de `de` para `para`). */
export function moverDentroDoGrupo<T extends ImagemInput>(
  grupos: GaleriaAgrupada<T>,
  grupo: ImovelImagemGrupo,
  de: number,
  para: number,
): GaleriaAgrupada<T> {
  const lista = [...grupos[grupo]];
  const [item] = lista.splice(de, 1);
  if (item === undefined) return { ...grupos };
  lista.splice(para, 0, item);
  return { ...grupos, [grupo]: lista };
}

/** Tira do grupo de origem e insere na posição indicada do grupo de destino. */
export function moverEntreGrupos<T extends ImagemInput>(
  grupos: GaleriaAgrupada<T>,
  grupoOrigem: ImovelImagemGrupo,
  indiceOrigem: number,
  grupoDestino: ImovelImagemGrupo,
  indiceDestino: number,
): GaleriaAgrupada<T> {
  const listaOrigem = [...grupos[grupoOrigem]];
  const [item] = listaOrigem.splice(indiceOrigem, 1);
  if (item === undefined) return { ...grupos };

  if (grupoOrigem === grupoDestino) {
    listaOrigem.splice(indiceDestino, 0, item);
    return { ...grupos, [grupoOrigem]: listaOrigem };
  }

  const listaDestino = [...grupos[grupoDestino]];
  listaDestino.splice(indiceDestino, 0, item);
  return { ...grupos, [grupoOrigem]: listaOrigem, [grupoDestino]: listaDestino };
}

/** Acrescenta imagens ao fim de um grupo. */
export function adicionarAoGrupo<T extends ImagemInput>(
  grupos: GaleriaAgrupada<T>,
  grupo: ImovelImagemGrupo,
  novas: T[],
): GaleriaAgrupada<T> {
  return { ...grupos, [grupo]: [...grupos[grupo], ...novas] };
}

/** Remove a imagem num índice de um grupo. */
export function removerDoGrupo<T extends ImagemInput>(
  grupos: GaleriaAgrupada<T>,
  grupo: ImovelImagemGrupo,
  indice: number,
): GaleriaAgrupada<T> {
  return { ...grupos, [grupo]: grupos[grupo].filter((_, i) => i !== indice) };
}
