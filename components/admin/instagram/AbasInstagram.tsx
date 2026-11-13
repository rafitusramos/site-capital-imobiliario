"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { label: "Caixa de entrada", href: "/admin/instagram/", exato: true },
  { label: "Automações", href: "/admin/instagram/automacoes/", exato: false },
  { label: "Conexão", href: "/admin/instagram/conexao/", exato: false },
];

export function AbasInstagram() {
  const pathname = usePathname().replace(/\/?$/, "/");
  return (
    <nav aria-label="Seções do Instagram" className="mb-6 flex gap-1 border-b border-neutral-200">
      {ABAS.map((a) => {
        const ativa = a.exato ? pathname === a.href : pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativa ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium transition ${
              ativa
                ? "border-[var(--jade)] text-[var(--jade)]"
                : "border-transparent text-neutral-600 hover:text-[var(--abissal)]"
            }`}
          >
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}
