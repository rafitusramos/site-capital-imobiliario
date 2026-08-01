-- =====================================================================
-- 016_crm_campos_e_tags.sql
-- Terceira migration da Fase 2 do CRM (docs/crm-spec.md, §2.3). Campos
-- que a spec pede e ainda não existem, tags, e o registro de exclusão
-- definitiva (LGPD). Financiamento já tem todos os campos pedidos
-- (valor_imovel, valor_entrada, renda_mensal, valor_credito,
-- banco_simulado, prazo_meses) — nenhuma coluna nova ali.
--
-- Loan-to-Value não é coluna: é valor_credito_desejado / valor_imovel_
-- garantia, calculado em lib/crm/calculos.ts. Gravar um derivado criaria
-- a chance de ele discordar das duas parcelas que o originam.
--
-- Migration puramente aditiva (nenhum drop de coluna/tabela/constraint),
-- por isso sem `begin`/`commit` — ao contrário de 014 e 015, uma falha
-- no meio não deixa o schema pela metade de um jeito perigoso: cada
-- `alter table ... add column` e `create table` é independente.
--
-- Rodar no SQL Editor do Supabase, depois de 015_crm_interacoes_lembretes.sql.
-- =====================================================================

-- =====================================================================
-- 1. CAMPOS NOVOS POR ORIGEM
-- =====================================================================
alter table public.lead_home_equity
  add column situacao_imovel text;      -- quitado | financiado | alienado | inventario

alter table public.lead_consorcio
  add column segmento     text,          -- imovel | veiculo | servicos
  add column grupo        text,
  add column contemplacao text;          -- nao-contemplado | em-lance | contemplado

alter table public.lead_imovel
  add column imovel_desejado  text,      -- texto livre p/ imóvel fora do catálogo
  add column orcamento_max    numeric(14,2),
  add column cidade_preferida text,
  add column dormitorios_min  int,
  add column tipo_imovel      text;

-- =====================================================================
-- 2. TAGS
-- =====================================================================
create table public.crm_tags (
  slug  text primary key,
  label text not null,
  cor   text not null default '#8A6C48',
  ordem int not null default 0,
  ativo boolean not null default true
);

-- Seed mínimo (a spec permite começar vazia ou com 2-3 exemplos). O
-- admin cria/edita tags livremente depois — não há tela de edição nesta
-- fase (docs/crm-spec.md, "Fora de escopo"), então o SQL Editor é o
-- único jeito de mudar este seed por ora.
insert into public.crm_tags (slug, label, cor, ordem) values
  ('capital-giro', 'Capital de giro', '#8A6C48', 1),
  ('urgente',      'Urgente',         '#8A3B2E', 2),
  ('vip',          'VIP',             '#1C4633', 3);

create table public.lead_tags (
  lead_id  uuid not null references public.leads(id) on delete cascade,
  tag_slug text not null references public.crm_tags(slug) on delete cascade,
  primary key (lead_id, tag_slug)
);
create index idx_lead_tags_tag on public.lead_tags (tag_slug);

-- =====================================================================
-- 3. CRM_EXCLUSOES
-- Registro de exclusão definitiva, para que apagar dado a pedido do
-- titular (LGPD) seja comprovável sem guardar dado pessoal nenhum —
-- só protocolo, tipo e quem excluiu.
-- =====================================================================
create table public.crm_exclusoes (
  id           uuid primary key default uuid_generate_v4(),
  protocolo    text not null,
  tipo         text not null,
  excluido_por uuid references public.profiles(id) on delete set null,
  motivo       text,
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- 4. VW_LEADS_CRM — recriada aqui, não em 015
-- O SELECT usa lead_tags (criada acima) e lead_imovel.orcamento_max
-- (adicionada acima); nenhuma das duas existia ainda em
-- 015_crm_interacoes_lembretes.sql, então a view só pode ser recriada
-- depois delas. Uma consulta serve o quadro inteiro: os `left join
-- lateral` de última interação e próximo lembrete eliminam o N+1 óbvio;
-- as tags vêm por array_agg. O filtro de arquivados mora aqui, não em
-- cada consulta da aplicação, para não haver como esquecer
-- (docs/crm-spec.md, caso de borda #6).
-- =====================================================================
create view public.vw_leads_crm as
select
  l.id, l.protocolo, l.nome, l.email, l.telefone, l.cpf,
  l.tipo, t.label as tipo_label,
  l.status, e.label as etapa_label, e.cor_bg, e.cor_texto,
  e.ordem as etapa_ordem, e.is_final, e.is_ganho, e.exige_motivo, e.sla_dias,
  l.origem, l.pagina_url, l.imovel_id, i.titulo as imovel_titulo,
  l.corretor_id, p.full_name as corretor_nome,
  l.favorito, l.motivo_perda, l.utm,
  l.created_at, l.status_alterado_em, l.updated_at,
  extract(day from now() - l.status_alterado_em)::int as dias_na_etapa,
  ult.ultima_interacao_em,
  prox.agendado_para as proximo_lembrete_em,
  prox.descricao     as proximo_lembrete_desc,
  coalesce(tg.tags, '{}') as tags,
  (select count(*) from public.lead_interacoes li where li.lead_id = l.id) as total_interacoes,
  coalesce(fin.valor_credito, he.valor_credito_desejado,
           cons.valor_carta, im.orcamento_max) as valor_negocio
from public.leads l
join public.lead_tipos t on t.slug = l.tipo
join public.crm_etapas e on e.tipo = l.tipo and e.slug = l.status
left join public.imoveis  i on i.id = l.imovel_id
left join public.profiles p on p.id = l.corretor_id
left join public.lead_financiamento fin on fin.lead_id = l.id
left join public.lead_home_equity   he  on he.lead_id  = l.id
left join public.lead_consorcio     cons on cons.lead_id = l.id
left join public.lead_imovel        im  on im.lead_id  = l.id
left join lateral (
  select max(li.created_at) as ultima_interacao_em
    from public.lead_interacoes li where li.lead_id = l.id
) ult on true
left join lateral (
  select lb.agendado_para, lb.descricao
    from public.crm_lembretes lb
   where lb.lead_id = l.id and not lb.concluido
   order by lb.agendado_para asc limit 1
) prox on true
left join lateral (
  select array_agg(lt.tag_slug order by lt.tag_slug) as tags
    from public.lead_tags lt where lt.lead_id = l.id
) tg on true
where l.arquivado_em is null;

-- =====================================================================
-- FIM — 016_crm_campos_e_tags.sql
-- Confira com:
--   select * from public.vw_leads_crm limit 5;
-- =====================================================================
