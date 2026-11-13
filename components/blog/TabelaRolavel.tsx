"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";

/**
 * Tabela do artigo com esmaecido nas bordas (styles/blog.css, `.tabela-moldura`).
 *
 * No celular nada indicava que havia mais colunas à direita. O estado começa
 * falso nos dois lados: o HTML do servidor sai sem esmaecido (igual a antes,
 * sem divergência de hidratação) e o efeito liga depois de medir.
 */
export function TabelaRolavel(props: ComponentPropsWithoutRef<"table">) {
  const ref = useRef<HTMLDivElement>(null);
  const [esq, setEsq] = useState(false);
  const [dir, setDir] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      setEsq(el.scrollLeft > 1);
      setDir(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    const tabela = el.firstElementChild;
    if (tabela) ro?.observe(tabela);
    return () => {
      el.removeEventListener("scroll", medir);
      ro?.disconnect();
    };
  }, []);

  return (
    <div className="tabela-moldura" data-esq={esq || undefined} data-dir={dir || undefined}>
      <div ref={ref} className="tabela-rolagem" role="region" aria-label="Tabela" tabIndex={0}>
        <table {...props} />
      </div>
    </div>
  );
}
