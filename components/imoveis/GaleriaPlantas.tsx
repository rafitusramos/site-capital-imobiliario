"use client";

import { useEffect, useRef, useState } from "react";
import { Carrossel, type ImagemCarrossel } from "@/components/imoveis/Carrossel";
import { ImagemImovel } from "@/components/imoveis/ImagemImovel";
import { SIZES_LIGHTBOX } from "@/lib/imoveis/imagem-otimizada";
import { altDaImagem } from "@/lib/imoveis/seo";

type GaleriaPlantasProps = {
  imagens: ImagemCarrossel[];
  ariaLabel: string;
  /** Nome e cidade do imóvel, para o `alt` das plantas. Ver `contextoDoImovel`. */
  contexto: string;
};

/**
 * Carrossel de plantas com ampliação: clicar na planta já centralizada abre um
 * lightbox sobre a página, sem tirar o visitante da LP. Fica num componente
 * cliente próprio porque a página do imóvel é Server Component.
 */
export function GaleriaPlantas({ imagens, ariaLabel, contexto }: GaleriaPlantasProps) {
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const gatilhoRef = useRef<HTMLElement | null>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  function abrir(indice: number) {
    gatilhoRef.current = document.activeElement as HTMLElement | null;
    setAmpliada(indice);
  }

  function fechar() {
    setAmpliada(null);
    gatilhoRef.current?.focus();
  }

  useEffect(() => {
    if (ampliada === null) return;
    fecharRef.current?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAmpliada(null);
        gatilhoRef.current?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    // Trava o scroll do fundo enquanto a planta está ampliada.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [ampliada]);

  const imagemAmpliada = ampliada !== null ? imagens[ampliada] : null;

  return (
    <>
      <Carrossel imagens={imagens} ariaLabel={ariaLabel} contexto={contexto} aoAmpliar={abrir} />

      {imagemAmpliada ? (
        <div
          className="im-planta-scrim"
          role="dialog"
          aria-modal="true"
          aria-label={imagemAmpliada.ambiente ?? "Planta ampliada"}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <div className="im-planta-caixa">
            <button
              type="button"
              ref={fecharRef}
              className="im-planta-fechar"
              onClick={fechar}
              aria-label="Fechar planta ampliada"
            >
              ×
            </button>
            {/* Só existe depois do clique: a planta ampliada carrega sob demanda. */}
            <ImagemImovel
              src={imagemAmpliada.url}
              alt={altDaImagem(imagemAmpliada.ambiente, contexto)}
              width={1400}
              height={900}
              sizes={SIZES_LIGHTBOX}
              priority
            />
            {imagemAmpliada.ambiente ? (
              <p className="im-planta-legenda">{imagemAmpliada.ambiente}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
