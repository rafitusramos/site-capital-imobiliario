import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "@/app/actions/admin-auth";
import { Marca } from "@/components/admin/Marca";
import { SidebarAdmin } from "@/components/admin/SidebarAdmin";
import { ToasterProvider } from "@/components/admin/Toaster";

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

  // Ser da equipe = ter linha em `profiles` (mesma pergunta de eh_membro_crm(),
  // migration 039). O middleware já encerra a sessão dessa conta; aqui só
  // barramos a renderização — Server Component não grava cookie, então sem signOut.
  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (erroPerfil) {
    // Falha transitória não pode trancar o admin para fora: segue, a RLS protege os dados.
    console.error("[admin/layout] falha ao ler o perfil:", erroPerfil);
  } else if (!perfil) {
    redirect("/admin/login/?acesso=negado");
  }

  return (
    // ToasterProvider envolve todo o admin autenticado (docs/crm-spec.md
    // §3.1): o CRM é o primeiro consumidor, mas o toast é um utilitário de
    // toda a área logada, não só desta feature.
    <ToasterProvider>
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
          {/* min-w-0: item de flex não encolhe abaixo da largura intrínseca
              do conteúdo por padrão (min-width: auto) — sem isto, uma página
              com conteúdo largo (ex.: o quadro do CRM) estica o `main`
              inteiro e a rolagem horizontal vaza para a página toda, em vez
              de ficar confinada à área que de fato precisa rolar. */}
          <main className="min-w-0 flex-1 bg-[var(--marfim)] px-6 py-8">{children}</main>
        </div>
      </div>
    </ToasterProvider>
  );
}
