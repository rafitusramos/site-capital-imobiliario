-- =====================================================================
-- 038_whatsapp_base.sql
-- Atendimento por WhatsApp (fase 1): tabelas wa_*, RLS, fila de envio,
-- limpezas e consentimento. Spec: docs/superpowers/specs/
-- 2026-11-13-whatsapp-atendimento-design.md (§7.8, §7.11).
--
-- POR QUE
-- O lead que preenche o formulário passa a receber confirmação e avisos de
-- etapa pelo WhatsApp oficial (Cloud API), e a conversa fica no painel. Esta
-- migration só cria a base de dados; o código que a usa vem em outras tarefas.
--
-- REGRAS
--   * Tudo é só do admin: RLS ligada, `revoke all ... from anon` e
--     `from authenticated`, e só o necessário volta por grant. Toda policy é
--     `to authenticated` com public.eh_admin() (padrão da 031/035).
--   * `wa_eventos` não tem policy: só a service role (idempotência do webhook).
--   * `wa_config` é singleton; o admin só altera `numero_oficial`.
--   * `wa_contatos.ultima_entrada_em` = última mensagem DO CLIENTE (janela de
--     24 h da Meta). `resposta_fixa_em` limita a resposta automática fixa.
--   * `wa_envios` é a fila de saída. `wa_reservar_envios` reserva um lote com
--     `for update skip locked`, devolve no máximo UMA linha por contato por
--     chamada e ignora contato com envio `enviado` nos últimos 6 s (ou com
--     outro em `processando` recente), para preservar a ordem das mensagens.
--   * `consentimento_whatsapp_em` em leads: quando o lead autorizou contato
--     por WhatsApp (nulo = sem consentimento registrado).
--   * `crm_emails_tipo_check` ganha 'whatsapp-admin' (aviso ao dono).
--   * Retenção: contato SEM lead e sem interação há 12 meses é apagado; evento
--     bruto do webhook com mais de 30 dias também.
--
-- NÃO aplique à mão: o workflow migrations-supabase (supabase db push) roda
-- cada arquivo numa transação, por isso não há begin/commit aqui.
-- Idempotente nos jobs do pg_cron (reagenda sem duplicar).
--
-- COMO VERIFICAR: bloco comentado no fim deste arquivo.
-- COMO DESFAZER:  bloco comentado no fim deste arquivo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Consentimento no lead.
-- ---------------------------------------------------------------------
alter table public.leads
  add column if not exists consentimento_whatsapp_em timestamptz;

-- ---------------------------------------------------------------------
-- 2. crm_emails: novo tipo 'whatsapp-admin' (lista vigente da 030 + 1).
-- ---------------------------------------------------------------------
alter table public.crm_emails drop constraint if exists crm_emails_tipo_check;
alter table public.crm_emails
  add constraint crm_emails_tipo_check
  check (tipo in ('novo-lead-admin', 'novo-lead-lead', 'etapa-admin', 'etapa-lead', 'simulacao', 'whatsapp-admin'));

-- ---------------------------------------------------------------------
-- 3. wa_config: singleton.
-- ---------------------------------------------------------------------
create table public.wa_config (
  id                smallint primary key default 1 check (id = 1),
  numero_oficial    text,
  atualizado_em     timestamptz not null default now(),
  ultimo_evento_em  timestamptz
);

insert into public.wa_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. wa_contatos: um por número (wa_id).
-- ---------------------------------------------------------------------
create table public.wa_contatos (
  id                   uuid primary key default gen_random_uuid(),
  wa_id                text not null unique,
  nome_perfil          text,
  lead_id              uuid references public.leads(id) on delete cascade,
  ultima_entrada_em    timestamptz,
  resposta_fixa_em     timestamptz,
  ultima_interacao_em  timestamptz not null default now(),
  criado_em            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. wa_mensagens: histórico da conversa.
-- ---------------------------------------------------------------------
create table public.wa_mensagens (
  id          uuid primary key default gen_random_uuid(),
  contato_id  uuid not null references public.wa_contatos(id) on delete cascade,
  direcao     text not null check (direcao in ('entrada', 'saida')),
  tipo        text not null check (tipo in ('texto', 'template', 'botao', 'outro')),
  texto       text,
  template    text,
  meta_id     text unique,
  status      text check (status in ('enviado', 'entregue', 'lido', 'falhou')),
  erro        text,
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. wa_envios: fila de saída (idempotente por `chave`).
-- ---------------------------------------------------------------------
create table public.wa_envios (
  id            uuid primary key default gen_random_uuid(),
  chave         text not null unique,
  contato_id    uuid not null references public.wa_contatos(id) on delete cascade,
  lead_id       uuid references public.leads(id) on delete cascade,
  motivo        text not null check (motivo in ('confirmacao', 'etapa', 'resposta_fixa')),
  etapa         text,
  payload       jsonb not null,
  enviar_apos   timestamptz not null default now(),
  estado        text not null default 'pendente' check (estado in ('pendente', 'processando', 'enviado', 'falhou', 'cancelado')),
  tentativas    int not null default 0,
  erro          text,
  meta_id       text,
  reservado_em  timestamptz,
  enviado_em    timestamptz,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. wa_eventos: eventos brutos do webhook (idempotência por `chave`).
-- ---------------------------------------------------------------------
create table public.wa_eventos (
  chave          text primary key,
  payload        jsonb,
  recebido_em    timestamptz not null default now(),
  processado_em  timestamptz,
  erro           text,
  tentativas     int not null default 0
);

-- Índices dos acessos quentes (fila, histórico, retenção, vínculo com o lead).
create index wa_envios_fila_idx        on public.wa_envios (enviar_apos) where estado in ('pendente', 'processando');
create index wa_envios_contato_idx     on public.wa_envios (contato_id);
create index wa_envios_lead_idx        on public.wa_envios (lead_id);
create index wa_envios_meta_idx        on public.wa_envios (meta_id);
create index wa_mensagens_contato_idx  on public.wa_mensagens (contato_id, criado_em desc);
create index wa_contatos_lead_idx      on public.wa_contatos (lead_id);
create index wa_contatos_interacao_idx on public.wa_contatos (ultima_interacao_em);
create index wa_eventos_recebido_idx   on public.wa_eventos (recebido_em);

-- ---------------------------------------------------------------------
-- RLS e privilégios (padrão da 031/035: anon sem nada, policy `to authenticated`).
-- ---------------------------------------------------------------------
alter table public.wa_config enable row level security;
alter table public.wa_contatos enable row level security;
alter table public.wa_mensagens enable row level security;
alter table public.wa_envios enable row level security;
alter table public.wa_eventos enable row level security;

revoke all on table public.wa_config from anon;
revoke all on table public.wa_contatos from anon;
revoke all on table public.wa_mensagens from anon;
revoke all on table public.wa_envios from anon;
revoke all on table public.wa_eventos from anon;

revoke all on table public.wa_config from authenticated;
revoke all on table public.wa_contatos from authenticated;
revoke all on table public.wa_mensagens from authenticated;
revoke all on table public.wa_envios from authenticated;
revoke all on table public.wa_eventos from authenticated;

grant select on public.wa_config    to authenticated;
grant update (numero_oficial) on public.wa_config to authenticated;
grant select on public.wa_contatos  to authenticated;
grant select on public.wa_mensagens to authenticated;
grant select on public.wa_envios    to authenticated;

create policy wa_config_admin_read on public.wa_config
  for select to authenticated using (public.eh_admin());
create policy wa_config_admin_update on public.wa_config
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy wa_contatos_admin_read on public.wa_contatos
  for select to authenticated using (public.eh_admin());
create policy wa_mensagens_admin_read on public.wa_mensagens
  for select to authenticated using (public.eh_admin());
create policy wa_envios_admin_read on public.wa_envios
  for select to authenticated using (public.eh_admin());

-- wa_eventos: nenhuma policy (RLS ligada sem policy = só a service role).

-- ---------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------

-- Reserva um lote da fila. No máximo uma linha por contato por chamada (a
-- mais antiga), e só de contato sem envio `enviado` nos últimos 6 s nem outro
-- `processando` recente: mantém a ordem das mensagens de cada conversa.
-- `distinct on` não convive com `for update`, por isso os candidatos saem de
-- uma CTE e o travamento (`skip locked`) acontece no select por id.
-- `processando` há mais de 5 min volta a ser elegível (o disparo morreu).
create or replace function public.wa_reservar_envios(p_limite int)
returns setof public.wa_envios
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidatos as (
    select distinct on (contato_id) f.id, f.enviar_apos
      from public.wa_envios f
     where ((f.estado = 'pendente' and f.enviar_apos <= now())
         or (f.estado = 'processando' and f.reservado_em < now() - interval '5 minutes'))
       and not exists (
         select 1
           from public.wa_envios r
          where r.contato_id = f.contato_id
            and ((r.estado = 'enviado' and r.enviado_em > now() - interval '6 seconds')
              or (r.estado = 'processando' and r.reservado_em >= now() - interval '5 minutes'))
       )
     order by contato_id, f.enviar_apos, f.criado_em
  ),
  escolhidos as (
    select e.id
      from public.wa_envios e
      join candidatos c on c.id = e.id
     order by c.enviar_apos
     limit p_limite
       for update of e skip locked
  )
  update public.wa_envios u
     set estado = 'processando',
         reservado_em = now()
   where u.id in (select id from escolhidos)
  returning u.*;
end;
$$;

revoke execute on function public.wa_reservar_envios(int) from public, anon, authenticated;
grant execute on function public.wa_reservar_envios(int) to service_role;

-- Retenção: contato SEM lead e sem interação há 12 meses sai (a cascata leva
-- mensagens e envios). Contato com lead fica enquanto o lead existir.
create or replace function public.wa_apagar_inativos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  delete from public.wa_contatos
   where lead_id is null
     and ultima_interacao_em < now() - interval '12 months';
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.wa_apagar_inativos() from public, anon, authenticated;

-- Retenção: eventos brutos do webhook com mais de 30 dias.
create or replace function public.wa_limpar_eventos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  delete from public.wa_eventos
   where recebido_em < now() - interval '30 days';
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.wa_limpar_eventos() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Jobs: reagendados de forma idempotente (unschedule se existir).
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;

do $$
declare
  v_job text;
begin
  foreach v_job in array array['wa-apagar-inativos', 'wa-limpar-eventos'] loop
    if exists (select 1 from cron.job where jobname = v_job) then
      perform cron.unschedule(v_job);
    end if;
  end loop;
end;
$$;

-- 06:45 UTC = 03:45 America/Sao_Paulo.
select cron.schedule(
  'wa-apagar-inativos',
  '45 6 * * *',
  $$select public.wa_apagar_inativos()$$
);

-- 06:50 UTC = 03:50 America/Sao_Paulo.
select cron.schedule(
  'wa-limpar-eventos',
  '50 6 * * *',
  $$select public.wa_limpar_eventos()$$
);


-- =====================================================================
-- COMO VERIFICAR (rodar à mão no SQL Editor, depois de aplicada)
-- =====================================================================
-- 1) Anon sem acesso:
--    select has_table_privilege('anon', 'public.wa_contatos', 'SELECT');  -- false
-- 2) Admin só altera numero_oficial:
--    select has_column_privilege('authenticated', 'public.wa_config', 'numero_oficial', 'UPDATE');  -- true
--    select has_column_privilege('authenticated', 'public.wa_config', 'id', 'UPDATE');              -- false
-- 3) Fila fechada para o usuário logado:
--    select has_function_privilege('authenticated', 'public.wa_reservar_envios(int)', 'EXECUTE');  -- false
--    select has_function_privilege('service_role',  'public.wa_reservar_envios(int)', 'EXECUTE');  -- true
-- 4) Jobs:
--    select jobname, schedule from cron.job where jobname like 'wa-%';
-- 5) Tipo novo aceito em crm_emails:
--    select pg_get_constraintdef(oid) from pg_constraint where conname = 'crm_emails_tipo_check';
--
-- =====================================================================
-- COMO DESFAZER
-- =====================================================================
--    select cron.unschedule('wa-apagar-inativos');
--    select cron.unschedule('wa-limpar-eventos');
--    drop function public.wa_reservar_envios(int);
--    drop function public.wa_apagar_inativos();
--    drop function public.wa_limpar_eventos();
--    drop table public.wa_envios, public.wa_mensagens, public.wa_contatos,
--      public.wa_eventos, public.wa_config cascade;
--    alter table public.leads drop column consentimento_whatsapp_em;
--    alter table public.crm_emails drop constraint crm_emails_tipo_check;
--    alter table public.crm_emails add constraint crm_emails_tipo_check
--      check (tipo in ('novo-lead-admin', 'novo-lead-lead', 'etapa-admin', 'etapa-lead', 'simulacao'));
--    -- (antes, apague linhas crm_emails com tipo = 'whatsapp-admin')
