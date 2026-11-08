import type { ImovelModalidade } from "@/types/database";

// Escolha da capa do imóvel (hero, og:image, card). Pura e testável.
//
// Lançamento: a capa é a fachada (grupo `empreendimento`). Imóvel pronto: o
// que vende é a unidade, então a capa é a primeira foto da unidade (grupo
// `decorado`, "Fotos da unidade" no admin), caindo para o condomínio
// (`empreendimento`) quando a unidade ainda não tem foto.

type ImagemCapa = { url: string; grupo: string; ordem: number; destaque: boolean };

function primeiraDoGrupo(imagens: readonly ImagemCapa[], grupo: string): string | null {
  const doGrupo = imagens.filter((i) => i.grupo === grupo).sort((a, b) => a.ordem - b.ordem);
  return doGrupo[0]?.url ?? null;
}

/** Capa do hero e do og:image (lista já ordenada por `ordem`). */
export function capaDaPagina(
  imagens: readonly ImagemCapa[],
  modalidade: ImovelModalidade,
): string | null {
  if (modalidade === "pronto") {
    return (
      primeiraDoGrupo(imagens, "decorado") ??
      primeiraDoGrupo(imagens, "empreendimento") ??
      imagens[0]?.url ??
      null
    );
  }
  return (
    imagens.find((imagem) => imagem.grupo === "empreendimento")?.url ?? imagens[0]?.url ?? null
  );
}

/** Capa do card: no lançamento, a imagem de destaque ou a de menor ordem. */
export function capaDoCard(
  imagens: readonly ImagemCapa[] | null | undefined,
  modalidade: ImovelModalidade,
): string | null {
  if (!imagens || imagens.length === 0) return null;
  if (modalidade === "pronto") {
    const daUnidade = primeiraDoGrupo(imagens, "decorado") ?? primeiraDoGrupo(imagens, "empreendimento");
    if (daUnidade) return daUnidade;
  }
  const destaque = imagens.find((imagem) => imagem.destaque);
  if (destaque) return destaque.url;
  const ordenadas = [...imagens].sort((a, b) => a.ordem - b.ordem);
  return ordenadas[0]?.url ?? null;
}
