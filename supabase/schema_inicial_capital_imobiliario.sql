-- =====================================================================
-- SCHEMA INICIAL — Capital Imobiliário
-- Fase: Migração do blog estático (posts.js) para backend com Supabase
-- Autor único por enquanto (schema já preparado para múltiplos no futuro)
-- Rodar direto no SQL Editor do Supabase, na ordem em que aparece
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- FUNÇÃO UTILITÁRIA: atualizar updated_at automaticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================================
-- 1. PROFILES
-- Estende auth.users. Hoje só existe o admin (você), mas a tabela já
-- comporta múltiplos perfis (corretor) sem precisar de migração futura.
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'corretor')),
  avatar_url text,
  phone text,
  creci text, -- registro do corretor, se aplicável
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 2. CATEGORIES
-- Fixas por enquanto: Financiamento, Home Equity, Consórcio, Imóveis
-- =====================================================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name) values
  ('financiamento', 'Financiamento'),
  ('home-equity', 'Home Equity'),
  ('consorcio', 'Consórcio'),
  ('imoveis', 'Imóveis');

-- =====================================================================
-- 3. POSTS
-- Núcleo da migração do blog. slug preservado 1:1 do posts.js atual.
-- =====================================================================
create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,               -- manter idêntico ao posts.js atual (SEO)
  title text not null,
  excerpt text,
  content text not null,                    -- markdown ou HTML
  cover_image text,
  category_id uuid references public.categories(id),
  author_id uuid references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  -- campos de SEO (migrar idênticos primeiro, otimizar depois)
  seo_title text,
  seo_description text,
  canonical_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_posts_status on public.posts (status);
create index idx_posts_category on public.posts (category_id);
create index idx_posts_published_at on public.posts (published_at desc);

create trigger trg_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 4. IMOVEIS
-- Modelada agora, populada em fase futura (área de imóveis no admin)
-- =====================================================================
create table public.imoveis (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,                -- landing page própria do imóvel
  titulo text not null,
  bairro text,
  condominio text,
  cidade text default 'Vinhedo',
  estado text default 'SP',
  valor_venda numeric(14,2),
  valor_condominio numeric(10,2),
  valor_iptu numeric(10,2),
  descricao_breve text,
  descricao_completa text,
  metragem numeric(8,2),
  dormitorios int,
  banheiros int,
  vagas int,
  diferenciais jsonb default '[]'::jsonb,   -- lista de diferenciais
  latitude numeric(10,6),
  longitude numeric(10,6),
  video_youtube_url text,
  status text not null default 'ativo' check (status in ('ativo', 'reservado', 'vendido', 'inativo')),
  corretor_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_imoveis_status on public.imoveis (status);
create index idx_imoveis_bairro on public.imoveis (bairro);
create index idx_imoveis_valor on public.imoveis (valor_venda);

create trigger trg_imoveis_updated_at
  before update on public.imoveis
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4.1 IMOVEL_IMAGENS
-- Suporta o carrossel com foto em destaque (seção 3 do site)
-- ---------------------------------------------------------------------
create table public.imovel_imagens (
  id uuid primary key default uuid_generate_v4(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  url text not null,
  ambiente text,                 -- título do ambiente (ex: "Sala de estar")
  ordem int not null default 0,
  destaque boolean not null default false, -- foto 50% maior no carrossel
  created_at timestamptz not null default now()
);

create index idx_imovel_imagens_imovel on public.imovel_imagens (imovel_id, ordem);

-- =====================================================================
-- 5. LEADS
-- Alimentada pelos formulários: simulador de crédito, pré-qualificação
-- do imóvel, e formulário de "mais informações" pós-simulação
-- =====================================================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text not null,
  source text not null,           -- ex: 'simulador_credito', 'imovel_landing', 'blog'
  imovel_id uuid references public.imoveis(id),
  dados_simulacao jsonb,          -- percentual entrada, banco, valor, parcela estimada etc.
  status text not null default 'novo' check (status in ('novo', 'contatado', 'qualificado', 'descartado')),
  enviado_whatsapp boolean not null default false,
  enviado_crm boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_leads_status on public.leads (status);
create index idx_leads_created_at on public.leads (created_at desc);
create index idx_leads_imovel on public.leads (imovel_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- Público: leitura de posts publicados, imóveis ativos, categorias
-- Autenticado (admin): leitura/escrita total
-- Leads: apenas inserção pública (formulários), leitura só admin
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.imoveis enable row level security;
alter table public.imovel_imagens enable row level security;
alter table public.leads enable row level security;

-- PROFILES: cada usuário vê/edita o próprio perfil; admin vê todos
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- CATEGORIES: leitura pública, escrita só autenticado
create policy "categories_public_read" on public.categories
  for select using (true);

create policy "categories_admin_write" on public.categories
  for all using (auth.role() = 'authenticated');

-- POSTS: público só vê publicados; autenticado vê e edita tudo
create policy "posts_public_read_published" on public.posts
  for select using (status = 'published');

create policy "posts_admin_full_access" on public.posts
  for all using (auth.role() = 'authenticated');

-- IMOVEIS: público só vê ativos; autenticado vê e edita tudo
create policy "imoveis_public_read_ativos" on public.imoveis
  for select using (status = 'ativo');

create policy "imoveis_admin_full_access" on public.imoveis
  for all using (auth.role() = 'authenticated');

-- IMOVEL_IMAGENS: segue a visibilidade do imóvel pai
create policy "imovel_imagens_public_read" on public.imovel_imagens
  for select using (
    exists (
      select 1 from public.imoveis
      where imoveis.id = imovel_imagens.imovel_id
      and imoveis.status = 'ativo'
    )
  );

create policy "imovel_imagens_admin_full_access" on public.imovel_imagens
  for all using (auth.role() = 'authenticated');

-- LEADS: qualquer um (inclusive anônimo) pode inserir via formulário;
-- só autenticado pode ler/atualizar (dados sensíveis de contato)
create policy "leads_public_insert" on public.leads
  for insert with check (true);

create policy "leads_admin_read" on public.leads
  for select using (auth.role() = 'authenticated');

create policy "leads_admin_update" on public.leads
  for update using (auth.role() = 'authenticated');

-- =====================================================================
-- FIM DO SCHEMA INICIAL
-- Próximos passos: script de migração do posts.js -> tabela posts,
-- e a planilha de-para de URLs (arquivo separado)
-- =====================================================================
