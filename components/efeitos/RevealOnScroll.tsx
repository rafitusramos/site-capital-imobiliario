"use client";

import { useEffect } from "react";

export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.body.classList.add("reveal-ativo");

    const observer = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("visivel");
            observer.unobserve(entrada.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    const observarAtuais = () => {
      document.querySelectorAll<HTMLElement>(".reveal:not(.visivel)").forEach((el) => {
        observer.observe(el);
      });
    };

    observarAtuais();

    // O conteúdo do blog/admin pode montar após esta effect rodar (RSC + streaming);
    // reobserva quando novos nós entram no DOM para não deixá-los sem o listener.
    const mutationObserver = new MutationObserver(observarAtuais);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
