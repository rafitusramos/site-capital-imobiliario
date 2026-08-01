import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getArquivados } from "@/lib/queries/admin-crm";
import { PainelArquivados } from "@/components/admin/crm/PainelArquivados";

export const metadata: Metadata = { title: "Arquivados · CRM · Admin" };

/**
 * Leads arquivados (docs/crm-spec.md §1.4/§3.5): "a lixeira arquiva"
 * (decisão travada #3) — esta tela é quem restaura ou apaga de vez. O papel
 * do usuário logado decide se o botão "Excluir" aparece: a mesma checagem
 * que `excluirLead` (app/actions/admin-crm.ts) já faz no servidor antes de
 * apagar, só que aqui é para não OFERECER a ação a quem não pode usá-la —
 * não é a autoridade de permissão (essa continua sendo a action + RLS).
 */
export default async function ArquivadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let souAdmin = false;
  if (user) {
    const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    souAdmin = perfil?.role === "admin";
  }

  const arquivados = await getArquivados();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--abissal)]">Arquivados</h1>
        <Link
          href="/admin/crm/financiamento"
          className="text-sm font-medium text-[var(--jade)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]"
        >
          Voltar ao quadro
        </Link>
      </div>
      <PainelArquivados arquivados={arquivados} souAdmin={souAdmin} />
    </div>
  );
}
