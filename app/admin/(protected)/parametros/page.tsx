import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { decimalParaPercentual } from "@/lib/parametros/taxa";
import { TAXAS_PADRAO } from "@/lib/queries/parametros";
import { ParametrosForm } from "@/components/admin/ParametrosForm";
import { EmailsCrmForm } from "@/components/admin/EmailsCrmForm";

export const metadata: Metadata = { title: "Taxas dos Simuladores · Admin" };

export default async function ParametrosPage() {
  // Área autenticada e dinâmica por natureza — diferente de
  // lib/queries/parametros.ts (usado pelas páginas públicas estáticas), aqui
  // createClient() com cookies() é o cliente correto: a sessão já é
  // reconfirmada pelo layout protegido, e não há ISR a preservar.
  const supabase = await createClient();
  const { data } = await supabase
    .from("parametros_simulador")
    .select("financiamento_taxa_anual, home_equity_taxa_mensal, updated_at, atualizado_por")
    .eq("id", 1)
    .maybeSingle();

  // atualizado_por referencia auth.users(id), não public.profiles(id) — sem
  // FK direta para profiles, o embed automático do PostgREST (o mesmo usado
  // em posts.author_id, que referencia profiles diretamente) não se aplica
  // aqui. Por isso o nome do autor é buscado numa segunda consulta.
  let nomeAutor: string | null = null;
  if (data?.atualizado_por) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.atualizado_por)
      .maybeSingle();
    nomeAutor = perfil?.full_name ?? null;
  }

  const { data: etapasDb } = await supabase
    .from("crm_etapas")
    .select("tipo, slug, label, ordem, notifica_lead")
    .eq("ativo", true)
    .order("ordem");
  const etapasEmail = (etapasDb ?? []).map((e) => ({
    tipo: e.tipo,
    slug: e.slug,
    label: e.label,
    notificaLead: e.notifica_lead,
  }));

  const valoresIniciais = {
    financiamentoTaxaAnual: decimalParaPercentual(
      data ? Number(data.financiamento_taxa_anual) : TAXAS_PADRAO.financiamentoTaxaAnual,
    ),
    homeEquityTaxaMensal: decimalParaPercentual(
      data ? Number(data.home_equity_taxa_mensal) : TAXAS_PADRAO.homeEquityTaxaMensal,
    ),
  };

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-[var(--abissal)]">Taxas dos Simuladores</h1>
      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        Essas duas taxas alimentam os simuladores públicos de{" "}
        <span className="font-medium text-neutral-700">/financiamento</span> e{" "}
        <span className="font-medium text-neutral-700">/home_equity</span>. A mudança tende a
        aparecer no site imediatamente após salvar; se por algum motivo isso não acontecer, ela
        aparece de qualquer forma em até 1 hora, por causa da atualização automática dessas
        páginas.
      </p>
      <ParametrosForm
        valoresIniciais={valoresIniciais}
        atualizadoEm={data?.updated_at ?? null}
        atualizadoPorNome={nomeAutor}
      />

      <h2 className="mb-2 mt-10 text-lg font-semibold text-[var(--abissal)]">E-mails do CRM</h2>
      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        Você recebe um e-mail a cada lead novo e a cada mudança de etapa. Aqui você escolhe em quais
        etapas o próprio lead também recebe um aviso. O aviso sai 10 minutos depois da mudança; se o
        lead for movido de novo nesse intervalo (inclusive ao desfazer), o aviso anterior é cancelado.
      </p>
      <EmailsCrmForm etapas={etapasEmail} />
    </div>
  );
}
