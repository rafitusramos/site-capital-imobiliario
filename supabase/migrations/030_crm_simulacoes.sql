-- =====================================================================
-- 030_crm_simulacoes.sql
-- Simulação de financiamento enviada por e-mail ao lead (docs/crm-spec.md §3.7).
--
-- 1. Bucket privado `crm-simulacoes`
--    Guarda o PDF enviado a cada lead. public = false e NENHUMA policy em
--    storage.objects: só o servidor (service role, que ignora RLS) grava e
--    gera as URLs assinadas de curta duração que o modal usa para baixar.
--    Caminho: <lead_id>/<uuid>.pdf. Excluir o lead apaga as linhas de
--    crm_simulacoes por cascade, mas NÃO o arquivo: `excluirLead` remove o
--    arquivo do bucket (LGPD).
--
-- 2. crm_simulacoes
--    Histórico por lead: arquivo, dados lidos do PDF da Creditas (sem os
--    logos), quem enviou e o resultado do e-mail. Leitura: quem enxerga o
--    lead (o subselect em leads já passa pela RLS `leads_visiveis`).
--    Escrita: só a service role — nenhuma policy de insert/update/delete.
--
-- 3. crm_emails.tipo passa a aceitar 'simulacao'.
--    O check de 025 é inline e sem nome; o Postgres o nomeou
--    crm_emails_tipo_check.
--
-- Sem BEGIN/COMMIT: o CLI já envolve cada arquivo numa transação.
-- =====================================================================

-- 1. bucket ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-simulacoes',
  'crm-simulacoes',
  false,
  5242880, -- 5MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- 2. crm_simulacoes ----------------------------------------------------
create table public.crm_simulacoes (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  storage_path text not null,
  dados        jsonb not null,
  criado_por   uuid references public.profiles(id) on delete set null,
  email_status text not null
               check (email_status in ('enviado', 'falhou', 'sem-chave')),
  resend_id    text,
  created_at   timestamptz not null default now()
);

create index idx_crm_simulacoes_lead on public.crm_simulacoes (lead_id, created_at desc);

alter table public.crm_simulacoes enable row level security;

create policy "crm_simulacoes_select" on public.crm_simulacoes for select
  using (exists (select 1 from public.leads l where l.id = lead_id));

-- 3. crm_emails.tipo ---------------------------------------------------
alter table public.crm_emails drop constraint if exists crm_emails_tipo_check;
alter table public.crm_emails
  add constraint crm_emails_tipo_check
  check (tipo in ('novo-lead-admin', 'novo-lead-lead', 'etapa-admin', 'etapa-lead', 'simulacao'));
