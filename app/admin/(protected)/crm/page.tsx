import { redirect } from "next/navigation";

/**
 * `/admin/crm` sozinho não é uma origem válida — redireciona para a primeira
 * aba do quadro (docs/crm-spec.md §1.4). Financiamento é a origem histórica
 * do site (o simulador mais antigo), por isso é a aba padrão.
 */
export default function AdminCRMPage() {
  redirect("/admin/crm/financiamento");
}
