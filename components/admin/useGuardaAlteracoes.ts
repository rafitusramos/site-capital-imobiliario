"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { destinoInternoDoClique } from "@/lib/admin/alteracoes";

/**
 * Guarda de "alterações não salvas" dos editores do admin.
 *
 * Enquanto `sujo` for verdadeiro:
 * - `beforeunload` avisa em recarregar/fechar a aba (o texto é do navegador);
 * - um listener de clique em fase de captura, no `document`, intercepta
 *   qualquer `<a>` que navegue para outra página do mesmo site — tanto o
 *   `<Link>` do Next quanto o `<a>` simples (a nav do site usa `<a>`). Como
 *   roda antes do React e dá `stopPropagation`, o `<Link>` nunca chega a
 *   navegar; o destino fica em `destinoPendente` para o editor abrir o
 *   ConfirmarAcao "Descartar alterações?".
 *
 * Navegação por código (router.push/replace depois de salvar ou excluir) não
 * passa por clique e não é interceptada. O botão Voltar do navegador também não
 * é — o App Router não expõe um gancho confiável para ele.
 */
export function useGuardaAlteracoes(sujo: boolean) {
  const router = useRouter();
  const [destinoPendente, setDestinoPendente] = useState<string | null>(null);
  const sujoRef = useRef(sujo);

  useEffect(() => {
    sujoRef.current = sujo;
  }, [sujo]);

  useEffect(() => {
    if (!sujo) return;

    function aoFechar(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    function aoClicar(e: MouseEvent) {
      if (!sujoRef.current || e.defaultPrevented || e.button !== 0) return;
      const ancora = (e.target as Element | null)?.closest?.("a");
      if (!ancora) return;
      const destino = destinoInternoDoClique({
        href: ancora.getAttribute("href"),
        origem: window.location.origin,
        atual: window.location.pathname + window.location.search,
        alvo: ancora.getAttribute("target") ?? "",
        download: ancora.hasAttribute("download"),
        modificador: e.ctrlKey || e.metaKey || e.shiftKey || e.altKey,
      });
      if (!destino) return;
      e.preventDefault();
      e.stopPropagation();
      setDestinoPendente(destino);
    }

    window.addEventListener("beforeunload", aoFechar);
    document.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("beforeunload", aoFechar);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [sujo]);

  const cancelarSaida = useCallback(() => setDestinoPendente(null), []);

  const confirmarSaida = useCallback(() => {
    const destino = destinoPendente;
    setDestinoPendente(null);
    if (destino) router.push(destino);
  }, [destinoPendente, router]);

  return { saidaPendente: destinoPendente !== null, confirmarSaida, cancelarSaida };
}
