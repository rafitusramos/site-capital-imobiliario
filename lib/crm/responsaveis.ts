import type { Database } from "@/types/database";

type Perfil = Database["public"]["Tables"]["profiles"]["Row"];
export type ResponsavelCRM = Pick<Perfil, "id" | "full_name" | "avatar_url" | "role">;

/**
 * Lista de responsáveis do CRM: tira quem tem `oculto_no_crm` (usuário de QA,
 * migration 029) e devolve só os 4 campos que a interface usa — telefone e
 * CRECI de outros usuários não chegam ao cliente.
 *
 * `oculto_no_crm` é opcional no tipo de entrada de propósito: a query lê com
 * `select("*")` (ver `getDominios`) para o deploy desta branch funcionar antes
 * de a migration rodar, e aí a coluna simplesmente não vem — ninguém é ocultado.
 */
export function responsaveisVisiveis(perfis: (Partial<Perfil> & ResponsavelCRM)[]): ResponsavelCRM[] {
  return perfis
    .filter((p) => p.oculto_no_crm !== true)
    .map((p) => ({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, role: p.role }));
}
