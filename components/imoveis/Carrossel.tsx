"use client";

import { useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";

export type ImagemCarrossel = { url: string; ambiente: string | null };

type CarrosselProps = {
  imagens: ImagemCarrossel[];
  /** Legenda de acessibilidade da região (ex.: "Galeria do empreendimento"). */
  ariaLabel: string;
  /** A primeira imagem do primeiro carrossel da página pode carregar eager (acima da dobra). */
  primeiraEager?: boolean;
};

// Fator de intensidade do efeito de foco central — mesma constante do
// exemplo oficial "Tween Scale" do Embla, ajustado ao número de slides.
const FATOR_BASE = 0.52;
const ESCALA_MIN = 0.9;
const OPACIDADE_MIN = 0.65;

function dentroDoIntervalo(valor: number, min: number, max: number) {
  return Math.min(Math.max(valor, min), max);
}

/**
 * Carrossel com efeito de foco central (docs/carousel-spec.md), adaptado à
 * paleta e tipografia do site: Embla `loop:true`, `align:"center"`,
 * `dragFree:false`, sem plugin de autoplay (autoplay em galeria de imóvel
 * atrapalha e conflita com prefers-reduced-motion — desvio consciente do
 * spec original).
 */
export function Carrossel({ imagens, ariaLabel, primeiraEager = false }: CarrosselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    dragFree: false,
  });

  const fatorTween = useRef(0);
  const nosSlide = useRef<HTMLElement[]>([]);

  const definirFatorTween = useCallback(() => {
    if (!emblaApi) return;
    fatorTween.current = FATOR_BASE * emblaApi.scrollSnapList().length;
  }, [emblaApi]);

  const aplicarTween = useCallback(
    (api: NonNullable<typeof emblaApi>, nomeEvento?: string) => {
      const engine = api.internalEngine();
      const progressoScroll = api.scrollProgress();
      const slidesNaTela = api.slidesInView();
      const ehEventoScroll = nomeEvento === "scroll";

      api.scrollSnapList().forEach((snap, indiceSnap) => {
        let diferenca = snap - progressoScroll;
        const slidesNoSnap = engine.slideRegistry[indiceSnap] ?? [];

        slidesNoSnap.forEach((indiceSlide) => {
          if (ehEventoScroll && !slidesNaTela.includes(indiceSlide)) return;

          if (engine.options.loop) {
            engine.slideLooper.loopPoints.forEach((ponto) => {
              const alvo = ponto.target();
              if (indiceSlide === ponto.index && alvo !== 0) {
                const sinal = Math.sign(alvo);
                if (sinal === -1) diferenca = snap - (1 + progressoScroll);
                if (sinal === 1) diferenca = snap + (1 - progressoScroll);
              }
            });
          }

          const valorTween = 1 - Math.abs(diferenca * fatorTween.current);
          const proporcao = dentroDoIntervalo(valorTween, 0, 1);
          const escala = ESCALA_MIN + (1 - ESCALA_MIN) * proporcao;
          const opacidade = OPACIDADE_MIN + (1 - OPACIDADE_MIN) * proporcao;

          const no = nosSlide.current[indiceSlide];
          if (no) {
            no.style.setProperty("--escala", escala.toFixed(4));
            no.style.setProperty("--opacidade", opacidade.toFixed(4));
          }
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!emblaApi) return;

    const aoReiniciar = () => {
      nosSlide.current = emblaApi.slideNodes();
      definirFatorTween();
      aplicarTween(emblaApi);
    };
    const aoRolar = () => aplicarTween(emblaApi, "scroll");
    const aoFocarSlide = () => aplicarTween(emblaApi);

    nosSlide.current = emblaApi.slideNodes();
    definirFatorTween();
    aplicarTween(emblaApi);

    emblaApi.on("reInit", aoReiniciar);
    emblaApi.on("scroll", aoRolar);
    emblaApi.on("slideFocus", aoFocarSlide);

    return () => {
      emblaApi.off("reInit", aoReiniciar);
      emblaApi.off("scroll", aoRolar);
      emblaApi.off("slideFocus", aoFocarSlide);
    };
  }, [emblaApi, definirFatorTween, aplicarTween]);

  const aoTeclar = useCallback(
    (e: React.KeyboardEvent) => {
      if (!emblaApi) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        emblaApi.scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        emblaApi.scrollNext();
      }
    },
    [emblaApi],
  );

  if (imagens.length === 0) return null;

  return (
    <div
      className="im-carrossel"
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={aoTeclar}
    >
      <div className="im-carrossel-viewport" ref={emblaRef}>
        <div className="im-carrossel-trilho">
          {imagens.map((imagem, indice) => (
            <div
              className="im-carrossel-slide"
              key={`${imagem.url}-${indice}`}
              style={{ "--escala": 1, "--opacidade": 1 } as React.CSSProperties}
            >
              <button
                type="button"
                className="im-carrossel-slide-botao"
                onClick={() => emblaApi?.scrollTo(indice)}
                aria-label={imagem.ambiente ?? `Imagem ${indice + 1} de ${imagens.length}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagem.url}
                  alt={imagem.ambiente ?? ""}
                  loading={primeiraEager && indice === 0 ? "eager" : "lazy"}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="im-carrossel-seta im-carrossel-seta-prev"
        aria-label="Imagem anterior"
        onClick={() => emblaApi?.scrollPrev()}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12.5 4.5 6 10l6.5 5.5" />
        </svg>
      </button>
      <button
        type="button"
        className="im-carrossel-seta im-carrossel-seta-next"
        aria-label="Próxima imagem"
        onClick={() => emblaApi?.scrollNext()}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7.5 4.5 14 10l-6.5 5.5" />
        </svg>
      </button>
    </div>
  );
}
