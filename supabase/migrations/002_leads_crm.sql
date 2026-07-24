-- =====================================================================
-- 002_leads_crm.sql
-- Leads e CRM — RT Capital Imobiliário
-- Origem: plano_leads_crm_supabase.md, seções 3.1 a 3.6
-- Rodar no SQL Editor do Supabase, na ordem em que aparece.
-- Pré-requisito: supabase/schema_inicial_capital_imobiliario.sql já aplicado
-- (extensão uuid-ossp, função public.set_updated_at(), tabelas profiles e imoveis).
-- =====================================================================

-- =====================================================================
-- TIPOS DE LEAD
-- =====================================================================
create table public.lead_tipos (
  slug text primary key,
  label text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

insert into public.lead_tipos (slug, label, ordem, ativo) values
  ('financiamento', 'Financiamento',  1, true),
  ('home-equity',   'Home Equity',    2, true),
  ('imoveis',       'Imóveis',        3, true),
  ('consorcio',     'Consórcio',      4, false);  -- ativado quando o produto entrar

-- =====================================================================
-- STATUS DO FUNIL  (espelha o pipeline da planilha atual)
-- Cores em hex para o admin renderizar os chips coloridos.
-- Ajustar os hex à paleta da marca depois, se necessário.
-- =====================================================================
create table public.lead_status (
  slug text primary key,
  label text not null,
  cor_bg text not null,
  cor_texto text not null,
  ordem int not null,
  is_final boolean not null default false,  -- encerra o funil
  is_ganho boolean not null default false,  -- encerra com sucesso
  ativo boolean not null default true
);

insert into public.lead_status (slug, label, cor_bg, cor_texto, ordem, is_final, is_ganho) values
  ('criado',            'Criado',             '#E8E8E8', '#3A3A3A', 1, false, false),
  ('simulacao',         'Simulação',          '#FBE79B', '#5A4A10', 2, false, false),
  ('analise-credito',   'Análise de Crédito', '#B7D5EA', '#123A52', 3, false, false),
  ('credito-aprovado',  'Crédito Aprovado',   '#D6EDBD', '#31501C', 4, false, false),
  ('vistoria',          'Vistoria',           '#1F6F63', '#FFFFFF', 5, false, false),
  ('contrato-assinado', 'Contrato Assinado',  '#186B36', '#FFFFFF', 6, true,  true),
  ('perdido',           'Perdido',            '#C62828', '#FFFFFF', 7, true,  false);

-- =====================================================================
-- TABELA COMUM DE LEADS
-- =====================================================================

-- Remover a tabela antiga (só se o count() da Etapa 0 deu zero)
drop table if exists public.leads cascade;

-- Sequência para o protocolo legível no CRM (ex.: RT-2026-0001)
create sequence if not exists public.lead_protocolo_seq;

create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  protocolo text not null unique
    default 'RT-' || to_char(now(), 'YYYY') || '-' ||
            lpad(nextval('public.lead_protocolo_seq')::text, 4, '0'),

  -- classificação
  tipo   text not null references public.lead_tipos(slug),
  status text not null default 'criado' references public.lead_status(slug),

  -- dados comuns (o núcleo pedido)
  nome     text not null,
  email    text not null,
  telefone text not null,
  cpf      text,                      -- nulo na captação, preenchido na análise

  -- contexto de origem
  origem      text,                   -- 'simulador_financiamento', 'lp_imovel', 'blog'
  pagina_url  text,                   -- URL exata onde o formulário foi enviado
  imovel_id   uuid references public.imoveis(id) on delete set null,
  utm         jsonb default '{}'::jsonb,

  -- atribuição e operação
  corretor_id        uuid references public.profiles(id) on delete set null,
  enviado_whatsapp   boolean not null default false,
  enviado_crm        boolean not null default false,

  -- LGPD
  consentimento_lgpd boolean not null default false,
  consentimento_em   timestamptz,

  -- controle
  status_alterado_em timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_leads_status      on public.leads (status);
create index idx_leads_tipo        on public.leads (tipo);
create index idx_leads_created_at  on public.leads (created_at desc);
create index idx_leads_corretor    on public.leads (corretor_id);
create index idx_leads_email       on public.leads (lower(email));
create index idx_leads_cpf         on public.leads (cpf) where cpf is not null;

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- =====================================================================
-- TABELAS DE DETALHE POR TIPO
-- Relação 1:1 com leads. A PK é a própria FK — garante um detalhe por lead.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FINANCIAMENTO — simulador da LP e da página de imóvel
-- ---------------------------------------------------------------------
create table public.lead_financiamento (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  valor_imovel        numeric(14,2),
  percentual_entrada  numeric(5,2),      -- 20 a 80, do slider
  valor_entrada       numeric(14,2),
  valor_credito       numeric(14,2),
  prazo_meses         int,
  parcela_estimada    numeric(12,2),
  banco_simulado      text,              -- Caixa | Itau | Bradesco | Santander
  renda_mensal        numeric(12,2),
  usa_fgts            boolean,
  tipo_imovel         text,              -- residencial | comercial
  primeiro_imovel     boolean,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- HOME EQUITY — simulador de crédito com garantia
-- ---------------------------------------------------------------------
create table public.lead_home_equity (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  valor_imovel_garantia numeric(14,2),
  imovel_quitado        boolean,
  saldo_devedor         numeric(14,2),   -- se não quitado
  valor_credito_desejado numeric(14,2),
  valor_credito_estimado numeric(14,2),  -- calculado pelo simulador
  prazo_meses           int,
  parcela_estimada      numeric(12,2),
  finalidade            text,            -- capital_giro | quitar_dividas | reforma | investimento | outro
  tipo_imovel           text,            -- residencial | comercial | terreno
  pessoa                text,            -- pf | pj
  renda_mensal          numeric(12,2),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- IMÓVEIS — pré-qualificação da landing page do imóvel (3 perguntas)
-- ---------------------------------------------------------------------
create table public.lead_imovel (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  forma_pagamento   text,   -- financiamento | a_vista | fgts_financiamento | permuta
  prazo_compra      text,   -- imediato | ate_3_meses | ate_6_meses | pesquisando
  possui_entrada    text,   -- faixa de entrada disponível
  valor_entrada     numeric(14,2),
  ja_tem_aprovacao  boolean,
  observacoes       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CONSÓRCIO — estrutura pronta, produto ainda inativo
-- ---------------------------------------------------------------------
create table public.lead_consorcio (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  valor_carta        numeric(14,2),
  prazo_meses        int,
  parcela_estimada   numeric(12,2),
  objetivo           text,    -- imovel | reforma | investimento
  ja_possui_consorcio boolean,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- HISTÓRICO E INTERAÇÕES
-- =====================================================================

-- ---------------------------------------------------------------------
-- HISTÓRICO DE STATUS — alimentado automaticamente por trigger
-- ---------------------------------------------------------------------
create table public.lead_status_historico (
  id uuid primary key default uuid_generate_v4(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  status_anterior text references public.lead_status(slug),
  status_novo     text not null references public.lead_status(slug),
  alterado_por    uuid references public.profiles(id) on delete set null,
  observacao      text,
  created_at      timestamptz not null default now()
);

create index idx_lead_hist_lead on public.lead_status_historico (lead_id, created_at desc);

create or replace function public.log_lead_status_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.lead_status_historico (lead_id, status_anterior, status_novo, alterado_por)
    values (new.id, null, new.status, new.corretor_id);
    return new;
  end if;

  if (new.status is distinct from old.status) then
    insert into public.lead_status_historico (lead_id, status_anterior, status_novo, alterado_por)
    values (new.id, old.status, new.status, auth.uid());
    new.status_alterado_em = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_lead_status_insert
  after insert on public.leads
  for each row execute function public.log_lead_status_change();

create trigger trg_lead_status_update
  before update on public.leads
  for each row execute function public.log_lead_status_change();

-- ---------------------------------------------------------------------
-- INTERAÇÕES — notas e registro de contato (base do CRM)
-- ---------------------------------------------------------------------
create table public.lead_interacoes (
  id uuid primary key default uuid_generate_v4(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  tipo       text not null check (tipo in ('nota','ligacao','whatsapp','email','reuniao','proposta')),
  conteudo   text not null,
  autor_id   uuid references public.profiles(id) on delete set null,
  agendado_para timestamptz,          -- follow-up
  concluido  boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_lead_interacoes_lead on public.lead_interacoes (lead_id, created_at desc);
create index idx_lead_interacoes_followup
  on public.lead_interacoes (agendado_para)
  where concluido = false;

-- =====================================================================
-- VIEW CONSOLIDADA PARA O CRM
-- =====================================================================
create or replace view public.vw_leads_crm as
select
  l.id, l.protocolo, l.nome, l.email, l.telefone, l.cpf,
  l.tipo,   t.label as tipo_label,
  l.status, s.label as status_label, s.cor_bg, s.cor_texto, s.ordem as status_ordem,
  s.is_final, s.is_ganho,
  l.origem, l.pagina_url, l.imovel_id, i.titulo as imovel_titulo,
  l.corretor_id, p.full_name as corretor_nome,
  l.created_at, l.status_alterado_em,
  extract(day from now() - l.status_alterado_em)::int as dias_no_status,
  (select count(*) from public.lead_interacoes li where li.lead_id = l.id) as total_interacoes
from public.leads l
join public.lead_tipos  t on t.slug = l.tipo
join public.lead_status s on s.slug = l.status
left join public.imoveis  i on i.id = l.imovel_id
left join public.profiles p on p.id = l.corretor_id;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.lead_tipos             enable row level security;
alter table public.lead_status            enable row level security;
alter table public.leads                  enable row level security;
alter table public.lead_financiamento     enable row level security;
alter table public.lead_home_equity       enable row level security;
alter table public.lead_imovel            enable row level security;
alter table public.lead_consorcio         enable row level security;
alter table public.lead_status_historico  enable row level security;
alter table public.lead_interacoes        enable row level security;

-- Tabelas de apoio: leitura pública (o front usa para montar selects e cores)
create policy "lead_tipos_read"  on public.lead_tipos  for select using (true);
create policy "lead_status_read" on public.lead_status for select using (true);

-- Leads e detalhes: NENHUM acesso anônimo.
-- A captação entra por Server Action com service_role.
create policy "leads_admin_all"        on public.leads               for all using (auth.role() = 'authenticated');
create policy "lead_fin_admin_all"     on public.lead_financiamento  for all using (auth.role() = 'authenticated');
create policy "lead_he_admin_all"      on public.lead_home_equity    for all using (auth.role() = 'authenticated');
create policy "lead_imovel_admin_all"  on public.lead_imovel         for all using (auth.role() = 'authenticated');
create policy "lead_cons_admin_all"    on public.lead_consorcio      for all using (auth.role() = 'authenticated');
create policy "lead_hist_admin_read"   on public.lead_status_historico for select using (auth.role() = 'authenticated');
create policy "lead_inter_admin_all"   on public.lead_interacoes     for all using (auth.role() = 'authenticated');
