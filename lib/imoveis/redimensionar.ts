/**
 * Redução da imagem no navegador, antes de ela subir pela server action.
 *
 * Existe por dois motivos que se somam: função serverless na Vercel recusa
 * requisição acima de ~4,5MB, e foto de celular passa disso com facilidade —
 * então sem esta etapa o upload de uma foto comum falha em produção. E a LP
 * nunca precisou de mais que 2400px: o servidor já reencoda tudo para WebP
 * em `lib/imoveis/marca-dagua.ts`, então mandar 4000px pela rede é banda
 * jogada fora dos dois lados.
 *
 * Roda no cliente (usa canvas). O que vai para o bucket de originais é o
 * arquivo já reduzido, não o bruto da câmera — continua servindo para refazer
 * o selo depois, que é para o que ele existe.
 */

const LADO_MAXIMO = 2400;
const QUALIDADE = 0.9;

/** Abaixo disso não vale reencodar: o arquivo já cabe e o reencode só perderia
 * qualidade à toa. */
const TAMANHO_CONFORTAVEL = 1_500_000;

function trocarExtensao(nome: string): string {
  const ponto = nome.lastIndexOf(".");
  return `${ponto === -1 ? nome : nome.slice(0, ponto)}.webp`;
}

/**
 * Devolve a imagem pronta para upload — reduzida quando precisa, o próprio
 * arquivo quando não. Nunca lança: qualquer imprevisto devolve o original e
 * deixa a validação do servidor decidir, porque falhar aqui não pode custar
 * o upload inteiro.
 */
export async function prepararImagem(arquivo: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return arquivo;
  }

  let bitmap: ImageBitmap;
  try {
    // `imageOrientation: "from-image"` é obrigatório, não cosmético: o
    // reencode descarta o EXIF, e o `.rotate()` do sharp no servidor depende
    // dele para endireitar foto tirada na vertical. Sem isso aqui, a
    // orientação se perde entre as duas pontas e a foto sai deitada.
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    return arquivo;
  }

  try {
    const maiorLado = Math.max(bitmap.width, bitmap.height);
    const escala = Math.min(1, LADO_MAXIMO / maiorLado);
    if (escala === 1 && arquivo.size <= TAMANHO_CONFORTAVEL) return arquivo;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);

    const contexto = canvas.getContext("2d");
    if (!contexto) return arquivo;
    contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // WebP, e não JPEG: planta baixa em PNG costuma ter fundo transparente, e
    // JPEG achataria isso em preto.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALIDADE),
    );
    if (!blob || blob.size >= arquivo.size) return arquivo;

    return new File([blob], trocarExtensao(arquivo.name), { type: "image/webp" });
  } catch {
    return arquivo;
  } finally {
    bitmap.close();
  }
}
