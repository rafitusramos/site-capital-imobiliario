"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo de fundo do hero da home de imóveis. Cliente porque depende de APIs
 * de browser (matchMedia, IntersectionObserver) que não existem no server.
 *
 * Duas economias: usuários com prefers-reduced-motion nunca veem o vídeo
 * rodar (fica parado no primeiro quadro), e o vídeo pausa assim que sai da
 * viewport — o arquivo tem 8MB, não faz sentido gastar bateria/dados com ele
 * rolando fora de vista.
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
      src="/hero-imoveis.mp4"
      loop
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}
