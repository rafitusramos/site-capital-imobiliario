-- =====================================================================
-- 023_crm_arquivamento_automatico.sql
-- Arquivamento automático de leads em etapa final: job diário (pg_cron).
--
-- POR QUE
-- Lead `ganho` ou `perdido` não volta ao funil e só ocupa o quadro. Depois
-- de 30 dias na etapa, arquivar tira do quadro sem perder dado (arquivar
-- preserva tudo; a exclusão definitiva continua sendo ação separada e
-- manual — docs/crm-spec.md §1.4/§3.5).
--
-- REGRAS
--   * Etapas: só `ganho` e `perdido`. `nao-qualificado` NÃO entra, por
--     decisão do dono: pode ser reavaliado.
--   * Prazo: mais de 30 dias contados de `status_alterado_em`, que o
--     trigger log_lead_status_change (002/017) renova a cada troca de
--     etapa. É NOT NULL default now() desde a 002; o coalesce com
--     `updated_at` é só cinto-e-suspensório.
--   * Arquivar = arquivado_em = now(), arquivado_por = NULL. NULL significa
--     "sistema" (arquivo manual grava o id do usuário); a tela de
--     arquivados mostra "Arquivado automaticamente".
--   * Lead restaurado à mão NÃO é re-arquivado na noite seguinte:
--     restaurarLead grava `restaurado_em` (coluna nova, abaixo) e o job só
--     considera o lead de novo se ele mudar de etapa depois da restauração
--     (status_alterado_em passa a ser maior que restaurado_em) e voltar a
--     ficar mais de 30 dias numa etapa final.
--   * Agenda: 06:00 UTC = 03:00 em São Paulo (BRT, UTC-3, sem horário de
--     verão desde 2019), fora do horário de uso do CRM.
--
-- EFEITOS COLATERAIS (conferidos nas migrations 002/017)
--   * trg_lead_status_update (log_lead_status_change) só age quando
--     `status` muda; o job não toca em status, então NÃO grava linha em
--     lead_status_historico nem mexe em status_alterado_em.
--   * trg_leads_updated_at (set_updated_at) dispara em todo UPDATE: o
--     arquivamento renova `updated_at`. Só afeta quem estiver com o modal
--     do lead aberto na hora (LEAD_DESATUALIZADO, pede recarregar).
--   * `leads` não usa grant por coluna (a RLS governa o UPDATE), então a
--     coluna nova não exige grant.
--
-- A função é SECURITY DEFINER (precisa enxergar todos os leads,
-- independentemente de RLS) e tem o EXECUTE revogado de todo mundo: só o
-- pg_cron (rodando como postgres) e o SQL Editor a chamam.
--
-- Rodar no SQL Editor do Supabase, depois de 022_crm_contagens.sql.
-- Idempotente: pode ser rodada de novo (reagenda o job sem duplicar).
--
-- COMO VERIFICAR: bloco comentado no fim deste arquivo.
-- COMO DESFAZER:  bloco comentado no fim deste arquivo.
-- =====================================================================

begin;

alter table public.leads add column if not exists restaurado_em timestamptz;

comment on column public.leads.restaurado_em is
  'Quando o lead foi restaurado da lixeira (restaurarLead). O arquivamento automático ignora o lead até ele mudar de etapa de novo.';

create or replace function public.arquivar_leads_finais_antigos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Constantes da regra: mudou a decisão do dono, mude aqui.
  c_etapas_finais constant text[]   := array['ganho', 'perdido'];  -- NÃO inclui 'nao-qualificado'
  c_prazo         constant interval := interval '30 days';
  v_total integer;
begin
  update public.leads
     set arquivado_em  = now(),
         arquivado_por = null            -- null = sistema
   where arquivado_em is null
     and status = any (c_etapas_finais)
     and coalesce(status_alterado_em, updated_at) < now() - c_prazo
     and (restaurado_em is null
          or restaurado_em < coalesce(status_alterado_em, updated_at));

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.arquivar_leads_finais_antigos() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- pg_cron: job diário, reagendado de forma idempotente.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'crm-arquivar-finais-antigos') then
    perform cron.unschedule('crm-arquivar-finais-antigos');
  end if;
end;
$$;

-- 06:00 UTC = 03:00 America/Sao_Paulo.
select cron.schedule(
  'crm-arquivar-finais-antigos',
  '0 6 * * *',
  $$select public.arquivar_leads_finais_antigos()$$
);

commit;

-- =====================================================================
-- COMO VERIFICAR (rodar à mão no SQL Editor, depois do commit)
-- =====================================================================
-- 1) O job está agendado?
--    select * from cron.job where jobname = 'crm-arquivar-finais-antigos';
--
-- 2) Simulação: quantos leads seriam arquivados agora (mesmo predicado)?
--    select count(*) from public.leads
--     where arquivado_em is null
--       and status in ('ganho', 'perdido')
--       and coalesce(status_alterado_em, updated_at) < now() - interval '30 days'
--       and (restaurado_em is null
--            or restaurado_em < coalesce(status_alterado_em, updated_at));
--
-- 3) Rodar uma vez à mão (devolve a contagem de arquivados):
--    select public.arquivar_leads_finais_antigos();
--
-- 4) Últimas execuções do agendador (depois das 06:00 UTC):
--    select * from cron.job_run_details order by start_time desc limit 5;
--
-- =====================================================================
-- COMO DESFAZER
-- =====================================================================
-- Parar o job (a função e a coluna ficam inofensivas):
--    select cron.unschedule('crm-arquivar-finais-antigos');
-- Desarquivar o que o job pegou (arquivado_por nulo = sistema):
--    update public.leads set arquivado_em = null where arquivado_por is null and arquivado_em is not null;
-- Remoção completa (opcional):
--    drop function public.arquivar_leads_finais_antigos();
--    alter table public.leads drop column restaurado_em;
