-- =====================================================================
-- 022_crm_contagens.sql
-- Contagens do CRM calculadas no banco: RPC contar_leads_crm.
--
-- Antes, getContagensPorEtapa e getContagensPorAba traziam TODAS as linhas
-- de vw_leads_crm e somavam em JavaScript. O PostgREST limita cada resposta
-- a max-rows (1000 por padrão): passando disso a lista vinha truncada em
-- silêncio e o cabeçalho da coluna ("SIMULAÇÃO 7 · R$ 4.320.000") e o das
-- abas passavam a contar menos do que existe — quebrando o que o
-- docs/crm-spec.md §5 (caso 10) e §6 prometem: a contagem do cabeçalho
-- continua verdadeira mesmo com a lista de cards truncada.
--
-- Agora o GROUP BY roda no Postgres e a resposta tem no máximo uma linha
-- por (tipo, etapa) — algumas dezenas, nunca perto do teto.
--
-- SECURITY INVOKER de propósito (como mover_lead_crm em 017 e as RPCs da
-- 021): vw_leads_crm é security_invoker desde a 018, então a RLS de `leads`
-- continua valendo aqui dentro — um corretor só conta os leads que ele
-- enxerga (os seus e os sem dono), exatamente como no quadro. A função não
-- é caminho para escapar da policy.
--
-- Tipos: vw_leads_crm.tipo e .status são `text` (leads.tipo / leads.status,
-- FK composta para crm_etapas); valor_negocio é numeric. count(*) é bigint
-- e o PostgREST serializa bigint/numeric como número ou string conforme o
-- tamanho — o cliente converte com Number().
--
-- `p_tipo` nulo = todas as origens (cabeçalho de abas); preenchido = só o
-- quadro daquela origem. Não depende da ordem de etapas: quem completa as
-- etapas zeradas é a aplicação (lib/queries/admin-crm.ts).
--
-- Rodar no SQL Editor do Supabase, depois de 021_rpc_colecoes_atomicas.sql.
-- =====================================================================

begin;

create or replace function public.contar_leads_crm(p_tipo text default null)
returns table (tipo text, status text, total bigint, soma_valor_negocio numeric)
language sql stable security invoker
set search_path = public
as $$
  select v.tipo, v.status, count(*) as total, coalesce(sum(v.valor_negocio), 0) as soma_valor_negocio
    from public.vw_leads_crm v
   where p_tipo is null or v.tipo = p_tipo
   group by v.tipo, v.status;
$$;

-- Função nasce com EXECUTE para PUBLIC (inclui anon): revogar e conceder só
-- a quem está logado. A RLS já devolveria zero linhas ao anon, mas não há
-- por que expor o endpoint.
revoke execute on function public.contar_leads_crm(text) from public, anon;
grant execute on function public.contar_leads_crm(text) to authenticated;

commit;

-- =====================================================================
-- FIM — 022_crm_contagens.sql
-- Confira com (logado como admin, deve bater com o quadro):
--   select * from public.contar_leads_crm();
--   select * from public.contar_leads_crm('financiamento');
--   select tipo, count(*) from public.vw_leads_crm group by tipo;
--   -- a soma de `total` por tipo acima deve ser igual à da função
-- =====================================================================
