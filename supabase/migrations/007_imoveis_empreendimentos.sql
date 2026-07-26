-- =====================================================================
-- 007_imoveis_empreendimentos.sql
-- Vertical de Imóveis — empreendimentos em lançamento
-- Rodar no SQL Editor do Supabase, na ordem em que aparece.
-- Pré-requisito: 001_schema_inicial_capital_imobiliario.sql aplicado
-- (tabelas public.imoveis e public.imovel_imagens, função set_updated_at).
--
-- A tabela public.imoveis foi modelada em 001 para UNIDADE AVULSA DE
-- REVENDA (valor_venda, metragem, dormitorios — valores únicos).
-- Lançamento trabalha com FAIXAS ("27 a 42 m²", "1 e 2 dorms",
-- "a partir de R$ 234.300"). Esta migração estende a tabela em vez de
-- criar outra, porque leads.imovel_id, lead_imovel e vw_leads_crm já
-- apontam para imoveis — trocar de tabela quebraria as três.
-- =====================================================================

-- ---------------------------------------------------------------------
-- GUARDA
-- A migração remove colunas. Se a tabela tiver qualquer linha, ela aborta
-- em vez de destruir dado — a transação inteira do SQL Editor reverte.
-- ---------------------------------------------------------------------
do $$
begin
  if (select count(*) from public.imoveis) > 0 then
    raise exception
      'A tabela imoveis não está vazia (% linha(s)). Revise a migração antes de dropar colunas.',
      (select count(*) from public.imoveis);
  end if;
end $$;

-- =====================================================================
-- 1. IMOVEIS — colunas de empreendimento
-- =====================================================================
alter table public.imoveis
  -- formato do empreendimento
  add column tipo text not null default 'apartamento'
    check (tipo in ('apartamento', 'vila', 'loteamento')),
  -- fase comercial. NÃO confundir com status: status controla publicação
  -- (e a policy imoveis_public_read_ativos), fase é informação de venda.
  add column fase text not null default 'lancamento'
    check (fase in ('pre_lancamento', 'lancamento', 'em_construcao', 'pronto')),

  -- faixas ("27 a 42 m²", "1 e 2 dorms")
  add column area_min            numeric(8,2),
  add column area_max            numeric(8,2),
  add column dormitorios_min     int,
  add column dormitorios_max     int,
  add column banheiros_min       int,
  add column banheiros_max       int,
  add column vagas_min           int,
  add column vagas_max           int,

  add column valor_a_partir_de   numeric(14,2),
  -- texto livre, não date: a previsão é aproximada ("Dez/2027")
  add column previsao_entrega    text,

  add column construtora         text,
  add column construtora_logo_url text,

  add column endereco            text,
  add column cep                 text,

  -- seção "As unidades". "O projeto" reaproveita descricao_completa e o
  -- subtítulo do card reaproveita descricao_breve, ambas já existentes.
  add column descricao_unidades  text,

  add column seo_title           text,
  add column seo_description     text,

  -- ordenação manual no índice /imoveis/
  add column ordem               int not null default 0;

-- ---------------------------------------------------------------------
-- Colunas de unidade avulsa, substituídas pelas faixas acima.
-- ---------------------------------------------------------------------
drop index if exists public.idx_imoveis_valor;

alter table public.imoveis
  drop column valor_venda,
  drop column valor_condominio,
  drop column valor_iptu,
  drop column condominio,
  drop column metragem,
  drop column dormitorios,
  drop column banheiros,
  drop column vagas,
  -- substituída pela tabela imovel_diferenciais (jsonb não comporta
  -- grupo + ícone + ordem com CRUD decente no admin)
  drop column diferenciais;

create index idx_imoveis_fase  on public.imoveis (fase);
create index idx_imoveis_ordem on public.imoveis (ordem, created_at desc);

-- =====================================================================
-- 2. IMOVEL_IMAGENS — grupo de galeria
-- Permite galerias separadas na landing page (empreendimento × decorado)
-- e o carrossel de plantas.
-- =====================================================================
alter table public.imovel_imagens
  add column grupo text not null default 'empreendimento'
    check (grupo in ('empreendimento', 'decorado', 'planta', 'implantacao'));

create index idx_imovel_imagens_grupo on public.imovel_imagens (imovel_id, grupo, ordem);

-- =====================================================================
-- 3. IMOVEL_TIPOLOGIAS — "Quadro de Áreas" + plantas
-- =====================================================================
create table public.imovel_tipologias (
  id uuid primary key default uuid_generate_v4(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  nome text not null,                       -- ex.: "1 dormitório — 27 m²"
  area numeric(8,2),
  dormitorios int,
  suites int,
  banheiros int,
  vagas int,
  valor_a_partir_de numeric(14,2),
  planta_url text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_imovel_tipologias_imovel on public.imovel_tipologias (imovel_id, ordem);

-- =====================================================================
-- 4. IMOVEL_DIFERENCIAIS — checklist de lazer e grid de diferenciais
-- `icone` é o slug de um catálogo fixo de SVGs no código
-- (components/imoveis/icones.tsx). Nunca emoji: o ícone precisa herdar
-- cor e tamanho do contexto.
-- =====================================================================
create table public.imovel_diferenciais (
  id uuid primary key default uuid_generate_v4(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  grupo text not null default 'lazer' check (grupo in ('lazer', 'diferencial')),
  nome text not null,
  icone text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_imovel_diferenciais_imovel on public.imovel_diferenciais (imovel_id, grupo, ordem);

-- =====================================================================
-- 5. IMOVEL_FAQS — accordion "Perguntas frequentes" + JSON-LD FAQPage
-- =====================================================================
create table public.imovel_faqs (
  id uuid primary key default uuid_generate_v4(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  pergunta text not null,
  resposta text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_imovel_faqs_imovel on public.imovel_faqs (imovel_id, ordem);

-- =====================================================================
-- 6. RLS
-- Espelha imovel_imagens (001): leitura pública condicionada ao imóvel
-- pai estar ativo; escrita só para autenticado.
-- =====================================================================
alter table public.imovel_tipologias   enable row level security;
alter table public.imovel_diferenciais enable row level security;
alter table public.imovel_faqs         enable row level security;

create policy "imovel_tipologias_public_read" on public.imovel_tipologias
  for select using (
    exists (
      select 1 from public.imoveis
      where imoveis.id = imovel_tipologias.imovel_id
      and imoveis.status = 'ativo'
    )
  );

create policy "imovel_tipologias_admin_full_access" on public.imovel_tipologias
  for all using (auth.role() = 'authenticated');

create policy "imovel_diferenciais_public_read" on public.imovel_diferenciais
  for select using (
    exists (
      select 1 from public.imoveis
      where imoveis.id = imovel_diferenciais.imovel_id
      and imoveis.status = 'ativo'
    )
  );

create policy "imovel_diferenciais_admin_full_access" on public.imovel_diferenciais
  for all using (auth.role() = 'authenticated');

create policy "imovel_faqs_public_read" on public.imovel_faqs
  for select using (
    exists (
      select 1 from public.imoveis
      where imoveis.id = imovel_faqs.imovel_id
      and imoveis.status = 'ativo'
    )
  );

create policy "imovel_faqs_admin_full_access" on public.imovel_faqs
  for all using (auth.role() = 'authenticated');

-- =====================================================================
-- FIM — 007_imoveis_empreendimentos.sql
-- Próximo: 008_imoveis_storage.sql (bucket imovel-images)
-- =====================================================================
