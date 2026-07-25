import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/actions/admin-auth";

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
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-black/10 bg-[var(--branco)] px-6 py-4">
        <div className="text-sm font-semibold text-[var(--abissal)]">Admin · Blog</div>
        <form action={sair}>
          <button
            type="submit"
            className="text-sm font-medium text-neutral-500 transition hover:text-[var(--abissal)]"
          >
            Sair
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
