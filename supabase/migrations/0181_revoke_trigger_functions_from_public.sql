-- =====================================================================
-- 0181 — revoke execute das funções de trigger
--
-- Aplicada direto em produção em 2026-07-31 (registrada lá como
-- `018b_revoke_trigger_functions_from_public`) e gravada aqui só para o
-- repositório ficar completo. O prefixo numérico 0181 existe porque a CLI do
-- Supabase exige versão numérica; ele ordena entre 018 e 019.
-- =====================================================================

revoke execute on function public.log_lead_status_change() from public, anon, authenticated;
revoke execute on function public.validar_atribuicao_lead() from public, anon, authenticated;
