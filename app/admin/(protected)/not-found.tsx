import Link from "next/link";
import { ADMIN_HOME_COM_BARRA } from "@/lib/admin/rotas";

// Atende o notFound() de posts/[id], imoveis/[id] e crm/[origem]. Idioma
// visual do admin: Tailwind puro, quieto, funcional — espelha
// components/admin/crm/EstadoVazio.tsx.
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-black/10 px-6 py-10 text-center">
      <span className="font-mono text-xs text-neutral-400">404</span>
      <p className="mt-2 text-sm font-medium text-[var(--abissal)]">Registro não encontrado</p>
      <p className="mt-1 text-sm text-neutral-500">
        O item que você abriu foi excluído, ou o endereço está errado.
      </p>
      <Link
        href={ADMIN_HOME_COM_BARRA}
        className="mt-4 text-sm font-semibold text-[var(--jade)] hover:underline"
      >
        Voltar para o CRM
      </Link>
    </div>
  );
}
