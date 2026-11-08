import type { ImovelCapaOrigem, ImovelModalidade } from "@/types/database";

// Escolha da capa do imóvel (hero, og:image, card). Pura e testável.
//
// Lançamento: a capa é a fachada (grupo `empreendimento`). Imóvel pronto: a
// capa vem do grupo escolhido em `capa_origem` — `unidade` (padrão; grupo
// `decorado`, "Fotos da unidade" no admin) ou `condominio` (grupo
// `empreendimento`) —, caindo para o outro grupo quando o escolhido está vazio.

type ImagemCapa = { url: string; grupo: string; ordem: number; destaque: boolean };

function primeiraDoGrupo(imagens: readonly ImagemCapa[], grupo: string): string | null {
  const doGrupo = imagens.filter((i) => i.grupo === grupo).sort((a, b) => a.ordem - b.ordem);
  return doGrupo[0]?.url ?? null;
}

/** Grupos do pronto na ordem de preferência para a origem escolhida. */
function gruposDaOrigem(origem: ImovelCapaOrigem): [string, string] {
  return origem === "condominio" ? ["empreendimento", "decorado"] : ["decorado", "empreendimento"];
}

/** Capa do hero e do og:image (lista já ordenada por `ordem`). */
export function capaDaPagina(
  imagens: readonly ImagemCapa[],
  modalidade: ImovelModalidade,
  capaOrigem: ImovelCapaOrigem = "unidade",
): string | null {
  if (modalidade === "pronto") {
    const [escolhido, outro] = gruposDaOrigem(capaOrigem);
    return (
      primeiraDoGrupo(imagens, escolhido) ??
      primeiraDoGrupo(imagens, outro) ??
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
  capaOrigem: ImovelCapaOrigem = "unidade",
): string | null {
  if (!imagens || imagens.length === 0) return null;
  if (modalidade === "pronto") {
    const [escolhido, outro] = gruposDaOrigem(capaOrigem);
    const daOrigem = primeiraDoGrupo(imagens, escolhido) ?? primeiraDoGrupo(imagens, outro);
    if (daOrigem) return daOrigem;
  }
  const destaque = imagens.find((imagem) => imagem.destaque);
  if (destaque) return destaque.url;
  const ordenadas = [...imagens].sort((a, b) => a.ordem - b.ordem);
  return ordenadas[0]?.url ?? null;
}
