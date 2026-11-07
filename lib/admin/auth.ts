import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_HOME_COM_BARRA } from "@/lib/admin/rotas";

/** Id de linha (uuid) — validado antes de qualquer consulta que o receba do cliente. */
export const idSchema = z.string().uuid();

export const ERRO_SESSAO_EXPIRADA = "Sessão expirada. Faça login novamente.";
export const ERRO_APENAS_ADMIN = "Apenas administradores podem fazer isso.";

/** Cliente Supabase do request + usuário da sessão (null se não houver). */
export async function usuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Único lugar onde a checagem "é administrador?" das server actions de
 * conteúdo vive. Não substitui a RLS (policies usam eh_admin(), migration
 * 020) — é a primeira linha de defesa, que devolve mensagem clara em vez de
 * deixar o Postgres responder "zero linhas".
 */
export async function exigirAdmin() {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { supabase, user: null, erro: ERRO_SESSAO_EXPIRADA };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[exigirAdmin] falha ao ler o perfil:", error);
    return { supabase, user, erro: "Não foi possível confirmar sua permissão." };
  }
  if (!perfil || perfil.role !== "admin") return { supabase, user, erro: ERRO_APENAS_ADMIN };

  return { supabase, user, erro: undefined };
}

/**
 * Guarda de página: quem não é admin (ex.: corretor) volta para o CRM.
 * Sem sessão, o layout protegido já redireciona para o login.
 */
export async function garantirAdminOuRedirecionar() {
  const { erro } = await exigirAdmin();
  if (erro) redirect(ADMIN_HOME_COM_BARRA);
}
