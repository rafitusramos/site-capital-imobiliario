import { garantirAdminOuRedirecionar } from "@/lib/admin/auth";
import { AbasInstagram } from "@/components/admin/instagram/AbasInstagram";

// Corretor não gerencia o Instagram: volta para o CRM. A RLS (só admin)
// barra a leitura e a escrita de qualquer jeito; isto evita telas vazias.
export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  await garantirAdminOuRedirecionar();
  return (
    <div>
      <AbasInstagram />
      {children}
    </div>
  );
}
