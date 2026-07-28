"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo de fundo do hero da home de imóveis. Cliente porque depende de APIs
 * de browser (matchMedia, IntersectionObserver) que não existem no server.
 *
 * O `poster` é um quadro do próprio vídeo: pinta na hora, enquanto o mp4
 * carrega, e a troca para o vídeo é imperceptível por ser a mesma cena. Por
 * isso o elemento **não** entra com opacity:0 — isso esconderia o poster, que
 * é justamente o que resolve o hero vazio dos primeiros instantes.
 *
 * Duas economias: quem tem prefers-reduced-motion nunca vê o vídeo rodar (fica
 * no poster/primeiro quadro), e o vídeo pausa assim que sai da viewport.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const preferemReduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

    function tocar() {
      if (!video || preferemReduzirMovimento.matches) return;
      // play() retorna uma Promise que os browsers rejeitam quando o autoplay
      // é bloqueado — sem o catch isso vira unhandled rejection no console.
      video.play().catch(() => {});
    }

    tocar();

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!video) return;
        if (entrada.isIntersecting) {
          tocar();
        } else {
          video.pause();
        }
      },
      { threshold: 0 },
    );
    observador.observe(video);

    return () => {
      observador.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="im-hero-video"
      src="/hero-imoveis-1280.mp4"
      poster="/hero-imoveis-poster.jpg"
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
