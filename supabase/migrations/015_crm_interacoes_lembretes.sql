-- =====================================================================
-- 015_crm_interacoes_lembretes.sql
-- Segunda migration da Fase 2 do CRM (docs/crm-spec.md, §2.2). Normaliza
-- o tipo de interação numa tabela de domínio e separa o lembrete de
-- follow-up da interação em si (um lead pode ter mais de um lembrete
-- aberto, e "o contato aconteceu" não é a mesma coisa que "o follow-up
-- foi feito").
--
-- `vw_leads_crm` (que 014_crm_pipelines.sql dropou junto com
-- `lead_status`) é recriada só em 016_crm_campos_e_tags.sql, não aqui: o
-- SELECT dela usa `lead_tags` e `lead_imovel.orcamento_max`, e as duas
-- coisas só existem a partir de 016. Recriá-la nesta migration quebraria
-- a aplicação em ordem. `vw_crm_timeline` não tem essa dependência (só
-- usa tabelas que já existem neste ponto) e é criada abaixo, normalmente.
--
-- Tudo dentro de uma transação: dropa `lead_interacoes.agendado_para` e
-- `lead_interacoes.concluido` (e o índice construído sobre elas). Já
-- verificado no banco: 0 interações — não há dado de follow-up a migrar
-- para a tabela nova.
--
-- Rodar no SQL Editor do Supabase, depois de 014_crm_pipelines.sql.
-- =====================================================================

begin;

-- =====================================================================
-- 1. CRM_INTERACAO_TIPOS
-- Mesmo padrão que 011_imovel_tipos_fases.sql usou para imovel_tipos:
-- normaliza o antigo CHECK de texto (lead_interacoes_tipo_check, de
-- 002_leads_crm.sql) numa tabela de domínio.
-- =====================================================================
create table public.crm_interacao_tipos (
  slug  text primary key,
  label text not null,
  icone text not null,     -- slug do catálogo em components/admin/crm/icones.tsx
  ordem int not null default 0,
  ativo boolean not null default true
);

-- `icone` reaproveita o próprio slug como chave do catálogo (mesma
-- convenção que components/imoveis/icones.tsx usa para imovel_diferenciais):
-- fica óbvio qual entrada do catálogo cada tipo espera, sem inventar um
-- segundo nome que precisaria ser mantido em sincronia com este seed.
insert into public.crm_interacao_tipos (slug, label, icone, ordem) values
  ('ligacao',  'Ligação',     'ligacao',  1),
  ('whatsapp', 'WhatsApp',    'whatsapp', 2),
  ('email',    'E-mail',      'email',    3),
  ('reuniao',  'Reunião',     'reuniao',  4),
  ('visita',   'Visita',      'visita',   5),
  ('proposta', 'Proposta',    'proposta', 6),
  ('contrato', 'Contrato',    'contrato', 7),
  ('nota',     'Nota geral',  'nota',     8),
  ('sistema',  'Sistema',     'sistema',  9);   -- reservado para o log automático (lead_interacoes.automatica)

-- =====================================================================
-- 2. LEAD_INTERACOES — troca do CHECK pela FK de domínio
-- O lembrete vira tabela própria (crm_lembretes); agendado_para/concluido
-- aqui duplicariam a regra e confundiriam "contato feito" com "follow-up
-- cumprido".
-- =====================================================================
alter table public.lead_interacoes
  drop constraint lead_interacoes_tipo_check,
  add constraint lead_interacoes_tipo_fkey
    foreign key (tipo) references public.crm_interacao_tipos(slug),
  add column automatica boolean not null default false,
  drop column agendado_para,
  drop column concluido;

-- =====================================================================
-- 3. CRM_LEMBRETES
-- =====================================================================
create table public.crm_lembretes (
  id            uuid primary key default uuid_generate_v4(),
  lead_id       uuid not null references public.leads(id) on delete cascade,
  interacao_id  uuid references public.lead_interacoes(id) on delete set null,
  agendado_para timestamptz not null,
  descricao     text not null,
  concluido     boolean not null default false,
  concluido_em  timestamptz,
  concluido_por uuid references public.profiles(id) on delete set null,
  criado_por    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_lembretes_pendentes
  on public.crm_lembretes (lead_id, agendado_para) where not concluido;

-- =====================================================================
-- 4. VW_CRM_TIMELINE
-- Une interações, transições de etapa e lembretes numa única lista
-- cronológica, sem duplicar linha em lugar nenhum. Carregada sob demanda
-- ao abrir o modal do lead (docs/crm-spec.md §3.2) — não faz parte da
-- consulta do quadro.
-- =====================================================================
create view public.vw_crm_timeline as
  select li.lead_id, li.created_at as ocorrido_em, 'interacao' as natureza,
         li.tipo, t.label as tipo_label, li.conteudo as corpo,
         li.automatica, li.autor_id, p.full_name as autor_nome
    from public.lead_interacoes li
    join public.crm_interacao_tipos t on t.slug = li.tipo
    left join public.profiles p on p.id = li.autor_id
  union all
  select h.lead_id, h.created_at, 'etapa',
         h.status_novo, e.label, coalesce(h.motivo_obs, h.observacao),
         true, h.alterado_por, p.full_name
    from public.lead_status_historico h
    left join public.leads l on l.id = h.lead_id
    left join public.crm_etapas e on e.tipo = l.tipo and e.slug = h.status_novo
    left join public.profiles p on p.id = h.alterado_por;

commit;

-- =====================================================================
-- FIM — 015_crm_interacoes_lembretes.sql
-- vw_leads_crm ainda não existe neste ponto — só é recriada em
-- 016_crm_campos_e_tags.sql (ver nota no cabeçalho deste arquivo).
-- Confira com:
--   select * from public.vw_crm_timeline order by ocorrido_em desc limit 5;
-- =====================================================================
