-- =====================================================================
-- 025_crm_emails.sql
-- Fase 5 do CRM: e-mails de lead (Resend).
--
-- 1. crm_etapas.notifica_lead
--    Liga, por etapa, o aviso por e-mail ao próprio lead quando ele entra
--    nela. Nasce false em todas; o seed abaixo liga as etapas positivas
--    (intermediárias e finais com ganho). `criado`, `perdido` e
--    `nao-qualificado` ficam desligadas: perder ou desqualificar não gera
--    e-mail automático ao lead.
--    EXCEÇÃO ao espelho lib/crm/etapas.ts: este campo é lido do banco em
--    tempo de execução e editado em /admin/parametros, então NÃO existe
--    em etapas.ts. Não "corrija" adicionando lá.
--    Escrita: já coberta pela policy crm_etapas_admin_write (017), que usa
--    eh_admin() — nenhuma policy nova é necessária.
--
-- 2. crm_emails
--    Registro de cada tentativa de envio (dono e lead): status, id do
--    Resend (necessário para cancelar um envio agendado), horário agendado
--    e erro. Quem escreve é o servidor com a service role (que ignora
--    RLS), por isso há policy de leitura só para admin e NENHUMA de
--    insert/update/delete para authenticated: o corretor logado não deve
--    forjar nem apagar o histórico.
--    Status 'agendado' continua assim depois que o Resend entrega (não há
--    webhook); para saber se o e-mail ainda é cancelável, compare
--    agendado_para com now().
--
-- Rodar no SQL Editor do Supabase (ou pelo workflow de migrations). Sem
-- BEGIN/COMMIT: o CLI já envolve cada arquivo numa transação.
-- =====================================================================

-- 1. notifica_lead -----------------------------------------------------
alter table public.crm_etapas
  add column notifica_lead boolean not null default false;

comment on column public.crm_etapas.notifica_lead is
  'Se true, o lead recebe e-mail (agendado +10 min) ao entrar nesta etapa. Editável em /admin/parametros; NÃO espelhado em lib/crm/etapas.ts.';

update public.crm_etapas
   set notifica_lead = true
 where (tipo in ('financiamento', 'home-equity')
        and slug in ('simulacao', 'pre-aprovacao', 'vistoria', 'contrato', 'ganho'))
    or (tipo = 'consorcio'
        and slug in ('apresentacao', 'proposta', 'contrato', 'ganho'))
    or (tipo = 'imoveis'
        and slug in ('qualificacao', 'visita', 'proposta', 'contrato', 'ganho'));

-- 2. crm_emails --------------------------------------------------------
create table public.crm_emails (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads(id) on delete cascade,
  destinatario  text not null,
  tipo          text not null
                check (tipo in ('novo-lead-admin', 'novo-lead-lead', 'etapa-admin', 'etapa-lead')),
  etapa         text,
  resend_id     text,
  status        text not null
                check (status in ('agendado', 'enviado', 'cancelado', 'falhou', 'sem-chave')),
  agendado_para timestamptz,
  erro          text,
  created_at    timestamptz not null default now()
);

create index idx_crm_emails_lead_status on public.crm_emails (lead_id, status);

alter table public.crm_emails enable row level security;

create policy "crm_emails_admin_read" on public.crm_emails for select
  using (public.eh_admin());
