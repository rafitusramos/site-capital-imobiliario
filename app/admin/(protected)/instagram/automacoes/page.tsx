import type { Metadata } from "next";
import { listarAutomacoes } from "@/lib/queries/admin-instagram";
import { ListaAutomacoes } from "@/components/admin/instagram/ListaAutomacoes";

export const metadata: Metadata = { title: "Automações do Instagram · Admin" };
export const dynamic = "force-dynamic";

export default async function AutomacoesPage() {
  const automacoes = await listarAutomacoes();
  return <ListaAutomacoes automacoes={automacoes} />;
}
