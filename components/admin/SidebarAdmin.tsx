"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CHAVE_STORAGE = "admin-sidebar-expandida";

function IconeCRM({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="7" cy="7" r="2.5" />
      <path d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <circle cx="14.5" cy="7.5" r="2" />
      <path d="M12.8 8.9c1.9.3 3.2 1.6 3.2 3.6" />
    </svg>
  );
}

function IconeArtigos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 2.5h7l3 3V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V2.5z" />
      <path d="M12 2.5V5a.5.5 0 0 0 .5.5H15" />
      <path d="M7 9h6M7 11.5h6M7 14h4" />
    </svg>
  );
}

function IconeImoveis({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 9.5 10 3l7.5 6.5" />
      <path d="M4.5 8v8a.5.5 0 0 0 .5.5h3v-5h4v5h3a.5.5 0 0 0 .5-.5V8" />
    </svg>
  );
}

function IconeChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

const ITENS: {
  label: string;
  href: string | null;
  icone: ComponentType<{ className?: string }>;
}[] = [
  { label: "CRM", href: null, icone: IconeCRM },
  { label: "Cadastro de Artigos", href: "/admin/posts", icone: IconeArtigos },
  { label: "Cadastro de Imóveis", href: null, icone: IconeImoveis },
];

export function SidebarAdmin() {
  const pathname = usePathname();
  const [expandida, setExpandida] = useState(false);

  // Lê a preferência salva só depois do mount (evita mismatch de hidratação —
  // o servidor sempre renderiza colapsado).
  useEffect(() => {
    if (window.localStorage.getItem(CHAVE_STORAGE) === "1") setExpandida(true);
  }, []);

  function alternar() {
    setExpandida((atual) => {
      const novo = !atual;
      window.localStorage.setItem(CHAVE_STORAGE, novo ? "1" : "0");
      return novo;
    });
  }

  return (
    <nav
      className={`flex flex-none flex-col border-r border-black/10 bg-white py-3 transition-[width] duration-200 ${
        expandida ? "w-56" : "w-16"
      }`}
      aria-label="Navegação do painel administrativo"
    >
      <button
        type="button"
        onClick={alternar}
        aria-label={expandida ? "Recolher menu" : "Expandir menu"}
        className="mx-3 mb-3 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-black/5"
      >
        <IconeChevron className={`h-4 w-4 transition-transform ${expandida ? "rotate-180" : ""}`} />
      </button>

      <ul className="flex flex-col gap-1 px-3">
        {ITENS.map((item) => {
          const Icone = item.icone;

          if (!item.href) {
            return (
              <li key={item.label}>
                <div
                  title="Em breve"
                  className="flex h-10 items-center gap-3 rounded-md px-2.5 text-neutral-300"
                >
                  <Icone className="h-5 w-5 flex-none" />
                  {expandida ? <span className="whitespace-nowrap text-sm font-medium">{item.label}</span> : null}
                </div>
              </li>
            );
          }

          const ativo = pathname.startsWith(item.href);

          return (
            <li key={item.label}>
              <Link
                href={item.href}
                title={item.label}
                className={`flex h-10 items-center gap-3 rounded-md px-2.5 transition ${
                  ativo ? "bg-[var(--jade)]/10 text-[var(--jade)]" : "text-neutral-600 hover:bg-black/5"
                }`}
              >
                <Icone className="h-5 w-5 flex-none" />
                {expandida ? <span className="whitespace-nowrap text-sm font-medium">{item.label}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
