"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function ehAtivo(pathname: string, alvo: string): boolean {
  if (alvo === "/") return pathname === "/";
  return pathname.startsWith(alvo);
}

export function SiteNav() {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const solucoesAtivo = ehAtivo(pathname, "/financiamento") || ehAtivo(pathname, "/home_equity");

  useEffect(() => {
    setMenuAberto(false);
    setDropdownAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  return (
    <nav className="topbar" aria-label="Principal">
      <div className="wrap">
        <a className="marca" href="/" aria-label="Rafael Teixeira, Capital Imobiliário — início">
          <span className="selo" aria-hidden="true">RT</span>
          <span className="nome">
            Rafael Teixeira
            <small>Capital Imobiliário</small>
          </span>
        </a>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuAberto((atual) => !atual)}
        >
          <span className="nav-toggle-barra" aria-hidden="true" />
        </button>

        <div id="menu-principal" className={`topbar-nav${menuAberto ? " aberto" : ""}`}>
          <a className={`nav-link${ehAtivo(pathname, "/") ? " ativo" : ""}`} href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Início
          </a>
          <div className={`nav-drop${dropdownAberto ? " aberto" : ""}`}>
            <button
              className={`nav-link nav-drop-btn${solucoesAtivo ? " ativo" : ""}`}
              type="button"
              aria-expanded={dropdownAberto}
              aria-haspopup="true"
              onClick={() => setDropdownAberto((atual) => !atual)}
            >
              Soluções de Crédito
            </button>
            <div className="nav-drop-menu">
              <a href="/financiamento/" aria-current={ehAtivo(pathname, "/financiamento") ? "page" : undefined}>
                Financiamento
                <small>Compra do imóvel · SBPE</small>
              </a>
              <a href="/home_equity/" aria-current={ehAtivo(pathname, "/home_equity") ? "page" : undefined}>
                Home Equity
                <small>Crédito com garantia de imóvel</small>
              </a>
            </div>
          </div>
          <a
            className={`nav-link${ehAtivo(pathname, "/imoveis") ? " ativo" : ""}`}
            href="/imoveis/"
            aria-current={ehAtivo(pathname, "/imoveis") ? "page" : undefined}
          >
            Imóveis
          </a>
          <a
            className={`nav-link${ehAtivo(pathname, "/blog") ? " ativo" : ""}`}
            href="/blog/"
            aria-current={ehAtivo(pathname, "/blog") ? "page" : undefined}
          >
            Blog
          </a>
          <a
            className={`nav-link${ehAtivo(pathname, "/sobre") ? " ativo" : ""}`}
            href="/sobre/"
            aria-current={ehAtivo(pathname, "/sobre") ? "page" : undefined}
          >
            Sobre
          </a>
        </div>
      </div>
    </nav>
  );
}
