-- =====================================================================
-- 014_crm_pipelines.sql
-- Primeira migration da Fase 2 do CRM (docs/crm-spec.md, §2.1). Troca o
-- funil único de `lead_status` por um pipeline por tipo de lead, com a
-- integridade garantida no banco: FK composta (tipo, status) em `leads`
-- aponta para `crm_etapas (tipo, slug)`, então um lead nunca fica numa
-- etapa de um pipeline que não é o seu, nem por bug de aplicação.
--
-- Pré-requisito: 013_parametros_simulador.sql aplicado. Já verificado no
-- banco de produção: 0 leads, 0 interações, 0 histórico — por isso as
-- trocas de FK abaixo (que exigiriam backfill com dado existente) podem
-- ser feitas diretamente, sem migração de linha nenhuma.
--
-- Tudo dentro de uma transação: a partir daqui a migration dropa a tabela
-- `lead_status` e a view que depende dela. Se algo no meio falhar (ex.:
-- FK composta não bate por haver lead fora do seed abaixo), o ROLLBACK
-- devolve o banco ao estado anterior — mesmo padrão de
-- 011_imovel_tipos_fases.sql.
--
-- Rodar no SQL Editor do Supabase, depois de 013_parametros_simulador.sql.
-- =====================================================================

begin;

-- =====================================================================
-- 1. CRM_ETAPAS — etapas por pipeline
-- PK composta (tipo, slug) para que a FK em leads consiga amarrar etapa
-- ao tipo do lead. Índice único parcial garante uma única etapa inicial
-- por pipeline (usada por `criarLead` e pelo default 'criado' dos RPCs
-- criar_lead_* da migration 003).
-- =====================================================================
create table public.crm_etapas (
  tipo         text not null references public.lead_tipos(slug) on delete cascade,
  slug         text not null,
  label        text not null,
  ordem        int  not null,
  cor_bg       text not null,
  cor_texto    text not null,
  is_inicial   boolean not null default false,
  is_final     boolean not null default false,
  is_ganho     boolean not null default false,
  exige_motivo boolean not null default false,
  sla_dias     int,            -- dias saudáveis na etapa; alimenta a barra de tempo
  ativo        boolean not null default true,
  primary key (tipo, slug)
);
create unique index uq_crm_etapa_inicial
  on public.crm_etapas (tipo) where is_inicial;

-- Cores derivadas da paleta do admin (app/admin/admin.css), todas com
-- contraste >= 4.5:1 entre cor_texto e cor_bg (docs/crm-spec.md §2.1).
-- `nao-qualificado` é neutro de propósito — não qualificar é filtro, não
-- fracasso, e não deve compartilhar o vermelho de `perdido`.

-- Financiamento e Home Equity: pipelines idênticos (§1.1 — as duas origens
-- colapsam "Análise de Crédito" + "Crédito Aprovado" numa única
-- "Pré-Aprovação", decisão travada em docs/crm-spec.md).
insert into public.crm_etapas
  (tipo, slug, label, ordem, cor_bg, cor_texto, is_inicial, is_final, is_ganho, exige_motivo, sla_dias)
values
  ('financiamento', 'criado',         'Criado',         1, '#E9E5DA', '#4A4437', true,  false, false, false, 1),
  ('financiamento', 'simulacao',      'Simulação',      2, '#F0E2C8', '#6B4E22', false, false, false, false, 3),
  ('financiamento', 'pre-aprovacao',  'Pré-Aprovação',  3, '#D8E6DC', '#1C4633', false, false, false, false, 7),
  ('financiamento', 'vistoria',       'Vistoria',       4, '#BFD9C8', '#143728', false, false, false, false, 10),
  ('financiamento', 'contrato',       'Contrato',       5, '#1F6B4E', '#FFFFFF', false, false, false, false, 15),
  ('financiamento', 'ganho',          'Ganho',          6, '#0A241C', '#E8D9B8', false, true,  true,  false, null),
  ('financiamento', 'perdido',        'Perdido',        7, '#F3DEDA', '#7A2E22', false, true,  false, true,  null),

  ('home-equity',   'criado',         'Criado',         1, '#E9E5DA', '#4A4437', true,  false, false, false, 1),
  ('home-equity',   'simulacao',      'Simulação',      2, '#F0E2C8', '#6B4E22', false, false, false, false, 3),
  ('home-equity',   'pre-aprovacao',  'Pré-Aprovação',  3, '#D8E6DC', '#1C4633', false, false, false, false, 7),
  ('home-equity',   'vistoria',       'Vistoria',       4, '#BFD9C8', '#143728', false, false, false, false, 10),
  ('home-equity',   'contrato',       'Contrato',       5, '#1F6B4E', '#FFFFFF', false, false, false, false, 15),
  ('home-equity',   'ganho',          'Ganho',          6, '#0A241C', '#E8D9B8', false, true,  true,  false, null),
  ('home-equity',   'perdido',        'Perdido',        7, '#F3DEDA', '#7A2E22', false, true,  false, true,  null),

  ('consorcio',     'criado',         'Criado',         1, '#E9E5DA', '#4A4437', true,  false, false, false, 1),
  ('consorcio',     'apresentacao',   'Apresentação',   2, '#F0E2C8', '#6B4E22', false, false, false, false, 3),
  ('consorcio',     'proposta',       'Proposta',       3, '#D8E6DC', '#1C4633', false, false, false, false, 5),
  ('consorcio',     'contrato',       'Contrato',       4, '#1F6B4E', '#FFFFFF', false, false, false, false, 15),
  ('consorcio',     'ganho',          'Ganho',          5, '#0A241C', '#E8D9B8', false, true,  true,  false, null),
  ('consorcio',     'perdido',        'Perdido',        6, '#F3DEDA', '#7A2E22', false, true,  false, true,  null),

  ('imoveis',       'criado',          'Criado',          1, '#E9E5DA', '#4A4437', true,  false, false, false, 1),
  ('imoveis',       'qualificacao',    'Qualificação',    2, '#F0E2C8', '#6B4E22', false, false, false, false, 2),
  ('imoveis',       'visita',          'Visita',          3, '#BFD9C8', '#143728', false, false, false, false, 5),
  ('imoveis',       'proposta',        'Proposta',        4, '#D8E6DC', '#1C4633', false, false, false, false, 5),
  ('imoveis',       'contrato',        'Contrato',        5, '#1F6B4E', '#FFFFFF', false, false, false, false, 15),
  ('imoveis',       'ganho',           'Ganho',           6, '#0A241C', '#E8D9B8', false, true,  true,  false, null),
  ('imoveis',       'perdido',         'Perdido',         7, '#F3DEDA', '#7A2E22', false, true,  false, true,  null),
  ('imoveis',       'nao-qualificado', 'Não Qualificado', 8, '#E4E1DB', '#55504A', false, true,  false, true,  null);

-- =====================================================================
-- 2. CRM_MOTIVOS_PERDA
-- "Preço" e "Orçamento" são distintos de propósito: o imóvel caro demais
-- versus o cliente sem capacidade. `outro` exige texto livre (mín. 5
-- caracteres) — regra imposta em mover_lead_crm (017), não só no Zod.
-- =====================================================================
create table public.crm_motivos_perda (
  slug  text primary key,
  label text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

insert into public.crm_motivos_perda (slug, label, ordem) values
  ('preco',                  'Preço',                  1),
  ('credito-nao-aprovado',   'Crédito não aprovado',   2),
  ('sem-resposta',           'Sem resposta',           3),
  ('escolheu-concorrente',   'Escolheu concorrente',   4),
  ('lead-invalido',          'Lead inválido',          5),
  ('sem-interesse',          'Sem interesse',          6),
  ('orcamento',              'Orçamento',              7),
  ('duplicado',              'Duplicado',              8),
  ('outro',                  'Outro',                  9);

-- Ativa a aba de Consórcio (hoje ativo = false e sem formulário no site;
-- os leads entram pela criação manual do CRM — decisão travada em
-- docs/crm-spec.md, "Criação manual de lead no CRM").
update public.lead_tipos set ativo = true where slug = 'consorcio';

-- =====================================================================
-- 3. TROCA DO MODELO DE STATUS GLOBAL PELO MODELO POR PIPELINE
-- =====================================================================

-- Nome do constraint é o default do Postgres para a FK de coluna única
-- declarada em 002_leads_crm.sql (`status text ... references
-- lead_status(slug)`): <tabela>_<coluna>_fkey.
alter table public.leads drop constraint leads_status_fkey;
alter table public.leads
  add constraint leads_etapa_fkey
  foreign key (tipo, status) references public.crm_etapas (tipo, slug);

-- O histórico deixa de referenciar lead_status (que será removida) e
-- passa a guardar o motivo junto da transição — não só do estado atual
-- do lead. Nomes de constraint também são o default de FK de coluna
-- única declarada em 002_leads_crm.sql.
alter table public.lead_status_historico
  drop constraint lead_status_historico_status_anterior_fkey,
  drop constraint lead_status_historico_status_novo_fkey,
  add column motivo_perda text references public.crm_motivos_perda(slug),
  add column motivo_obs   text;

drop view if exists public.vw_leads_crm;   -- recriada em 016_crm_campos_e_tags.sql
drop table public.lead_status;

alter table public.leads
  add column motivo_perda text references public.crm_motivos_perda(slug),
  add column motivo_obs   text,
  add column favorito     boolean not null default false,
  add column arquivado_em timestamptz,
  add column arquivado_por uuid references public.profiles(id),
  add column campos_extras jsonb not null default '{}'::jsonb;

-- Cobre exatamente o predicado do quadro (tipo + etapa, ignorando
-- arquivados) e a tela de arquivados, sem index extra usado por nenhuma
-- das duas consultas.
create index idx_leads_quadro
  on public.leads (tipo, status) where arquivado_em is null;
create index idx_leads_arquivados
  on public.leads (arquivado_em) where arquivado_em is not null;

-- `leads.status` continua se chamando `status`, mas agora significa
-- "etapa dentro do pipeline do tipo do lead", não mais uma etapa de um
-- funil global único. Renomear a coluna quebraria os três RPCs
-- criar_lead_* (migration 003, que inserem sem passar status e contam
-- com o default 'criado') e a vw_leads_crm sem ganho real — o nome fica,
-- o significado muda, e fica documentado aqui.
comment on column public.leads.status is
  'Slug da etapa dentro do pipeline do tipo do lead (crm_etapas.slug, '
  'FK composta com leads.tipo). Não é mais um funil global único — o '
  'mesmo slug (ex.: "criado", "contrato", "ganho", "perdido") pode '
  'existir em mais de um pipeline com cor/SLA próprios.';

commit;

-- =====================================================================
-- FIM — 014_crm_pipelines.sql
-- Confira com:
--   select tipo, slug, label, ordem, is_inicial, is_final, is_ganho, exige_motivo, sla_dias
--   from public.crm_etapas order by tipo, ordem;
-- =====================================================================
