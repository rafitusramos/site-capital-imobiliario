"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { ehImagemOtimizavel } from "@/lib/imoveis/imagem-otimizada";

type ImagemImovelProps = Omit<ImageProps, "src" | "alt" | "unoptimized"> & {
  src: string;
  alt: string;
};

/**
 * `next/image` das fotos de imóvel: srcset responsivo pelo otimizador (só para
 * o bucket público do Supabase; outra URL vai `unoptimized`) e entrada com
 * fade-in.
 *
 * O fade vive em CSS (`img[data-fade]`, styles/imoveis.css) e só esconde a
 * imagem com `@media (scripting: enabled)`: sem JS a foto aparece normal. Foto
 * que já carregou antes da hidratação nunca dispara `onLoad` — por isso o
 * efeito confere `img.complete` no mount.
 */
export function ImagemImovel({ src, alt, onLoad, onError, ...resto }: ImagemImovelProps) {
  // Foto prioritária (a primeira da primeira galeria) nasce visível: o fade
  // esperaria a hidratação para revelá-la e atrasaria justamente a imagem que
  // mais importa. Derivado só das props, então servidor e cliente concordam.
  const prioritaria = resto.priority === true || resto.fetchPriority === "high";
  const [carregada, setCarregada] = useState(prioritaria);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (ref.current?.complete) setCarregada(true);
  }, []);

  return (
    <Image
      {...resto}
      ref={ref}
      src={src}
      alt={alt}
      unoptimized={!ehImagemOtimizavel(src)}
      data-fade={carregada ? "1" : "0"}
      onLoad={(e) => {
        setCarregada(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        // Imagem quebrada: mostra o alt em vez de um buraco invisível.
        setCarregada(true);
        onError?.(e);
      }}
    />
  );
}
