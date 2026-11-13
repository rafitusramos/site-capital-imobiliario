-- =====================================================================
-- 036_instagram_dm_cron.sql
-- Módulo Instagram (comentário -> DM): disparador por minuto e limpezas
-- diárias, via pg_cron + pg_net. Depende das funções da 035.
--
-- POR QUE
-- O envio das DMs é feito por uma rota do site (/api/meta/disparar/), que
-- reserva a fila (ig_reservar_envios) e chama a Graph API. O Vercel Hobby
-- só tem cron diário, então quem bate na rota a cada minuto é o próprio
-- banco: pg_cron chama ig_chamar_disparador(), que faz um POST via pg_net.
-- As duas limpezas (inativos e eventos antigos) também vivem aqui.
--
-- REGRAS
--   * Nenhum segredo nem URL real neste arquivo. Os dois valores ficam no
--     Vault do Supabase e são criados FORA da migration (SQL Editor):
--       select vault.create_secret('<url>',   'ig_disparar_url');
--         -- ex.: https://rtcapitalimobiliario.com.br/api/meta/disparar/
--       select vault.create_secret('<valor>', 'ig_cron_secret');
--         -- o mesmo valor da variável CRON_SECRET do site
--     Para trocar depois: vault.update_secret(<id>, '<novo valor>').
--   * Sem um dos dois segredos, ig_chamar_disparador() retorna sem fazer
--     nada (o job continua agendado, inofensivo).
--   * ig_chamar_disparador é SECURITY DEFINER (lê o Vault) e tem EXECUTE
--     revogado de todos: só o pg_cron (postgres) a chama.
--   * Agenda das limpezas: 06:15 e 06:30 UTC = 03:15 e 03:30 em São Paulo,
--     depois do arquivamento de leads da 023 (06:00 UTC).
--   * pg_net é assíncrono: o POST entra na fila e a resposta fica em
--     net._http_response.
--
-- Aplicada pelo workflow migrations-supabase (supabase db push), que já roda
-- cada arquivo numa transação: por isso não há begin/commit aqui.
-- Idempotente: reagenda os jobs sem duplicar.
--
-- COMO VERIFICAR: bloco comentado no fim deste arquivo.
-- COMO DESFAZER:  bloco comentado no fim deste arquivo.
-- =====================================================================


create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.ig_chamar_disparador()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url     text;
  v_segredo text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'ig_disparar_url' limit 1;
  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'ig_cron_secret' limit 1;

  if coalesce(v_url, '') = '' or coalesce(v_segredo, '') = '' then
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || v_segredo,
                 'Content-Type',  'application/json'
               ),
    body    := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.ig_chamar_disparador() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Jobs: reagendados de forma idempotente (unschedule se existir).
-- ---------------------------------------------------------------------
do $$
declare
  v_job text;
begin
  foreach v_job in array array['ig-disparar', 'ig-apagar-inativos', 'ig-limpar-eventos'] loop
    if exists (select 1 from cron.job where jobname = v_job) then
      perform cron.unschedule(v_job);
    end if;
  end loop;
end;
$$;

select cron.schedule(
  'ig-disparar',
  '* * * * *',
  $$select public.ig_chamar_disparador()$$
);

-- 06:15 UTC = 03:15 America/Sao_Paulo.
select cron.schedule(
  'ig-apagar-inativos',
  '15 6 * * *',
  $$select public.ig_apagar_inativos()$$
);

-- 06:30 UTC = 03:30 America/Sao_Paulo.
select cron.schedule(
  'ig-limpar-eventos',
  '30 6 * * *',
  $$select public.ig_limpar_eventos()$$
);


-- =====================================================================
-- COMO VERIFICAR (rodar à mão no SQL Editor, depois de aplicada)
-- =====================================================================
-- 1) Jobs agendados?
--    select jobname, schedule from cron.job where jobname like 'ig-%';
--
-- 2) Os dois segredos existem (sem mostrar o valor)?
--    select name from vault.decrypted_secrets
--     where name in ('ig_disparar_url', 'ig_cron_secret');
--
-- 3) Chamar o disparador à mão e ver a resposta da rota:
--    select public.ig_chamar_disparador();
--    select id, status_code, created from net._http_response order by created desc limit 5;
--
-- 4) Últimas execuções do agendador:
--    select * from cron.job_run_details
--     where command like '%ig_%' order by start_time desc limit 5;
--
-- =====================================================================
-- COMO DESFAZER
-- =====================================================================
--    select cron.unschedule('ig-disparar');
--    select cron.unschedule('ig-apagar-inativos');
--    select cron.unschedule('ig-limpar-eventos');
--    drop function public.ig_chamar_disparador();
-- Os segredos do Vault (opcional): delete from vault.secrets
--    where name in ('ig_disparar_url', 'ig_cron_secret');
