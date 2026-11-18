import { garantirAdminOuRedirecionar } from "@/lib/admin/auth";

// Corretor não gerencia o WhatsApp: volta para o CRM. A RLS (só admin) barra a
// leitura e a escrita de qualquer jeito; isto evita telas vazias.
export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  await garantirAdminOuRedirecionar();
  return <div>{children}</div>;
}
