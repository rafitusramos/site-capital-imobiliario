import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContagensPorEtapa, getDominios, getQuadro } from "@/lib/queries/admin-crm";
import { QuadroCRM } from "@/components/admin/crm/QuadroCRM";
import type { LeadTipoSlug } from "@/types/database";

const ORIGENS_VALIDAS = new Set(["financiamento", "home-equity", "imoveis", "consorcio"]);

const LABEL_ORIGEM: Record<LeadTipoSlug, string> = {
  financiamento: "Financiamento",
  "home-equity": "Home Equity",
  imoveis: "Imóveis",
  consorcio: "Consórcio",
};

type PaginaOrigemProps = {
  params: Promise<{ origem: string }>;
  searchParams: Promise<{ lead?: string; novo?: string }>;
};

export async function generateMetadata({ params }: PaginaOrigemProps): Promise<Metadata> {
  const { origem } = await params;
  if (!ORIGENS_VALIDAS.has(origem)) return { title: "CRM · Admin" };
  return { title: `${LABEL_ORIGEM[origem as LeadTipoSlug]} · CRM · Admin` };
}

/**
 * Quadro de uma origem (docs/crm-spec.md §1.4/§3.2). Server component: uma
 * consulta ao quadro (`getQuadro`), a agregação por etapa (para o cabeçalho
 * das colunas continuar verdadeira mesmo truncada, §5 caso 10) e o domínio
 * do módulo (etapas, motivos, tags, corretores) — tudo pronto antes de
 * chegar em QuadroCRM.tsx, que é client component.
 *
 * `origem` fora dos quatro slugs válidos é 404: não existe pipeline para
 * ela, e não há URL pública nenhuma sob `/admin` para preservar (regra
 * inviolável 1 do CLAUDE.md é sobre URLs do site público).
 */
export default async function QuadroOrigemPage({ params, searchParams }: PaginaOrigemProps) {
  const { origem } = await params;
  if (!ORIGENS_VALIDAS.has(origem)) notFound();
  const tipo = origem as LeadTipoSlug;

  // TODO(modal): `lead` é o gancho de docs/crm-spec.md §1.4 — `?lead=<id>`
  // deve abrir o modal do lead na mesma rota. ModalLead ainda não existe
  // (entra numa próxima etapa); por ora só lemos o searchParam e repassamos
  // como `leadAbertoId`, sem nenhum consumidor real ainda.
  const { lead: leadAberto } = await searchParams;

  const [leads, contagensPorEtapa, dominios] = await Promise.all([
    getQuadro(tipo),
    getContagensPorEtapa(tipo),
    getDominios(),
  ]);

  return (
    <QuadroCRM
      tipo={tipo}
      leadsIniciais={leads}
      contagensPorEtapa={contagensPorEtapa}
      dominios={dominios}
      leadAbertoId={leadAberto}
    />
  );
}
