import { garantirAdminOuRedirecionar } from "@/lib/admin/auth";

// Corretor não gerencia conteúdo: volta para o CRM. A RLS (migration 020)
// barra a escrita de qualquer jeito; isto só evita mostrar telas inúteis.
export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  await garantirAdminOuRedirecionar();
  return children;
}
