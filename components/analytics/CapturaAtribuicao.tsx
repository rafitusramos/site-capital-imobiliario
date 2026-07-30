"use client";

import { useEffect } from "react";
import { capturarAtribuicaoNaEntrada } from "@/lib/utm";

/**
 * Componente mínimo, sem render, no mesmo padrão do RevealOnScroll: só
 * existe para rodar um efeito na montagem. Capturar aqui — na primeira
 * página vista, em toda página do site — é o que resolve a perda de
 * atribuição de quem chega com ?gclid=... e navega antes de converter (ver
 * lib/utm.ts para o resto do raciocínio).
 */
export function CapturaAtribuicao() {
  useEffect(() => {
    capturarAtribuicaoNaEntrada();
  }, []);

  return null;
}
