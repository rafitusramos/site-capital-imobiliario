-- =====================================================================
-- 018_crm_views_security_invoker.sql
-- Correção de segurança em cima de 015/016. Apanhada pelo linter do
-- Supabase (lint 0010_security_definer_view) logo depois de aplicar a
-- 017 em produção.
--
-- O PROBLEMA
-- Uma view no Postgres executa com os privilégios de QUEM A CRIOU, não
-- de quem consulta, a menos que seja marcada com `security_invoker`.
-- Como `vw_leads_crm` e `vw_crm_timeline` foram criadas pelo owner do
-- schema, ler por elas ignorava por completo a RLS das tabelas de baixo
-- — inclusive a policy `leads_visiveis` que a 017 acabara de criar.
--
-- Na prática: toda a regra "admin vê tudo, corretor vê os seus e os não
-- atribuídos" existia na tabela `leads` e era anulada na única consulta
-- que o CRM de fato usa para montar o quadro. O modelo de permissão
-- inteiro da 017 era decorativo enquanto isto não fosse corrigido.
--
-- Já verificado antes de aplicar: todas as tabelas sob as duas views têm
-- policy de leitura para `authenticated` (leads, lead_tipos, crm_etapas,
-- imoveis, profiles, as quatro tabelas de detalhe, lead_interacoes,
-- lead_status_historico, crm_lembretes, lead_tags), então ligar
-- security_invoker não deixa nenhuma coluna inacessível ao admin.
--
-- Rodar no SQL Editor do Supabase, depois de 017_crm_funcoes_rls.sql.
-- =====================================================================

begin;

alter view public.vw_leads_crm   set (security_invoker = on);
alter view public.vw_crm_timeline set (security_invoker = on);

-- ---------------------------------------------------------------------
-- Funções de trigger fora da API REST
-- `log_lead_status_change` e `validar_atribuicao_lead` retornam `trigger`
-- e portanto nem chegariam a rodar por /rest/v1/rpc/... — mas o PostgREST
-- as expõe assim mesmo, e o linter (0028/0029) reclama com razão: função
-- SECURITY DEFINER exposta é superfície que não precisa existir. Revogar
-- EXECUTE não afeta os triggers: uma função de trigger é executada como
-- parte da DML, sem exigir EXECUTE de quem disparou.
--
-- O revoke tem de incluir `public`: no Postgres toda função nasce com
-- EXECUTE concedido a PUBLIC, e revogar só de anon/authenticated deixa o
-- grant herdado de PUBLIC intacto — o linter continua (com razão)
-- apontando a função como executável. Verificado na primeira tentativa:
-- a ACL ainda mostrava `=X/postgres`, que é justamente o grant a PUBLIC.
--
-- `eh_admin()` NÃO é revogada de propósito: as policies da 017 a chamam,
-- e a expressão da policy é avaliada com o usuário da consulta — revogar
-- faria toda consulta de authenticated virar erro de permissão. Ela
-- também não vaza nada: devolve false para quem não está logado.
-- ---------------------------------------------------------------------
revoke execute on function public.log_lead_status_change() from public, anon, authenticated;
revoke execute on function public.validar_atribuicao_lead() from public, anon, authenticated;

commit;

-- =====================================================================
-- FIM — 018_crm_views_security_invoker.sql
-- Confira com:
--   select relname, reloptions from pg_class
--    where relname in ('vw_leads_crm','vw_crm_timeline');
--   -- deve mostrar {security_invoker=on} nas duas
-- =====================================================================
