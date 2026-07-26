import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/actions/admin-auth";
import { Marca } from "@/components/admin/Marca";
import { SidebarAdmin } from "@/components/admin/SidebarAdmin";

// O middleware (middleware.ts) já bloqueia /admin/* sem sessão, mas não é a
// única linha de defesa: este layout reconfirma a sessão no servidor antes de
// renderizar qualquer página protegida.
export default async function AdminProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--marfim)]">
      <header className="flex items-center justify-between border-b border-black/10 bg-[var(--branco)] px-6 py-3">
        <div className="flex items-center gap-3">
          <Marca />
          <span className="h-6 w-px bg-black/10" aria-hidden="true" />
          <span className="text-sm font-semibold text-[var(--abissal)]">Painel Administrativo</span>
        </div>
        <form action={sair}>
          <button
            type="submit"
            className="text-sm font-medium text-neutral-500 transition hover:text-[var(--abissal)]"
          >
            Sair
          </button>
        </form>
      </header>
      <div className="flex flex-1">
        <SidebarAdmin />
        <main className="flex-1 bg-[var(--marfim)] px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
