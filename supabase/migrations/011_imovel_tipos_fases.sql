-- =====================================================================
-- 011_imovel_tipos_fases.sql
-- Normaliza `imoveis.tipo` e `imoveis.fase` (hoje texto com CHECK) em
-- tabelas de domínio próprias, no mesmo padrão de `categories` /
-- `posts.category_id` (001_schema_inicial_capital_imobiliario.sql).
--
-- Motivo: os valores hoje são fixos no código (CHECK constraint) e nos
-- rótulos (lib/imoveis/formato.ts). Virando tabela, o admin passa a poder
-- listar/ordenar/desativar opções sem deploy, e o "Quadro de tipos e
-- fases" vira dado, não enum.
--
-- Pré-requisito: 007_imoveis_empreendimentos.sql e 009_seed_imovel_exemplo.sql
-- aplicados (colunas texto `tipo`/`fase` existentes, com CHECK).
-- Rodar no SQL Editor do Supabase, na ordem em que aparece.
--
-- Tudo dentro de uma transação: é a primeira migração do projeto que DROPA
-- colunas, então ou aplica inteira ou não aplica nada. Se algum imóvel tiver
-- tipo/fase fora das listas abaixo, o backfill deixa o id nulo, o
-- `set not null` falha e o ROLLBACK devolve o banco ao estado anterior — em
-- vez de deixar a tabela pela metade e sem as colunas antigas.
-- =====================================================================

begin;

-- =====================================================================
-- 1. IMOVEL_TIPOS
-- =====================================================================
create table public.imovel_tipos (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  nome text not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.imovel_tipos (slug, nome, ordem) values
  ('apartamento',      'Apartamento',      0),
  ('studio',           'Studio',           1),
  ('casa',             'Casa',             2),
  ('chacara',          'Chácara',          3),
  ('sitio',            'Sítio',            4),
  ('terreno',          'Terreno',          5),
  ('predio-comercial', 'Prédio Comercial', 6),
  ('sala-comercial',   'Sala Comercial',   7),
  ('loja',             'Loja',             8),
  ('galpao',           'Galpão',           9);

-- =====================================================================
-- 2. IMOVEL_FASES
-- Os slugs abaixo são chave no código (mapa de ícones da timeline em
-- app/(site)/imoveis/[slug]/page.tsx e seletores CSS [data-fase="..."]
-- em styles/imoveis.css) — não mudar sem atualizar os dois.
-- =====================================================================
create table public.imovel_fases (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  nome text not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.imovel_fases (slug, nome, ordem) values
  ('pre_lancamento', 'Pré Lançamento',    0),
  ('lancamento',     'Lançamento',        1),
  ('em_construcao',  'Em Construção',     2),
  ('pronto',         'Pronto para Morar', 3);

-- =====================================================================
-- 3. IMOVEIS — troca das colunas texto pelas referências
-- Ordem importa: adicionar (nullable) -> backfill -> not null -> dropar
-- as colunas texto. Assim um banco novo que rode 009 e depois 011 em
-- sequência também funciona (o backfill lê a coluna texto antes dela
-- sumir).
-- =====================================================================
alter table public.imoveis
  add column tipo_id uuid references public.imovel_tipos(id),
  add column fase_id uuid references public.imovel_fases(id);

update public.imoveis i
set tipo_id = t.id
from public.imovel_tipos t
where t.slug = i.tipo;

update public.imoveis i
set fase_id = f.id
from public.imovel_fases f
where f.slug = i.fase;

alter table public.imoveis
  alter column tipo_id set not null,
  alter column fase_id set not null;

-- Dropar as colunas texto remove junto os CHECK constraints de tipo/fase.
drop index if exists public.idx_imoveis_fase;

alter table public.imoveis
  drop column tipo,
  drop column fase;

create index idx_imoveis_tipo on public.imoveis (tipo_id);
create index idx_imoveis_fase on public.imoveis (fase_id);

-- =====================================================================
-- 4. RLS
-- Leitura pública, escrita só autenticado — espelha categories_public_read
-- / categories_admin_write (001_schema_inicial_capital_imobiliario.sql).
-- =====================================================================
alter table public.imovel_tipos enable row level security;
alter table public.imovel_fases enable row level security;

create policy "imovel_tipos_public_read" on public.imovel_tipos
  for select using (true);

create policy "imovel_tipos_admin_write" on public.imovel_tipos
  for all using (auth.role() = 'authenticated');

create policy "imovel_fases_public_read" on public.imovel_fases
  for select using (true);

create policy "imovel_fases_admin_write" on public.imovel_fases
  for all using (auth.role() = 'authenticated');

commit;

-- =====================================================================
-- FIM — 011_imovel_tipos_fases.sql
-- Confira com:
--   select i.titulo, t.nome as tipo, f.nome as fase
--   from public.imoveis i
--   join public.imovel_tipos t on t.id = i.tipo_id
--   join public.imovel_fases f on f.id = i.fase_id;
-- =====================================================================
