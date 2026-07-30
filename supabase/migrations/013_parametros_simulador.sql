-- =====================================================================
-- 013_parametros_simulador.sql
-- Move as duas taxas de juros hoje hardcoded nos simuladores públicos
-- (components/financiamento/SimuladorFinanciamento.tsx e
-- components/home-equity/SimuladorHomeEquity.tsx) para uma tabela editável
-- pelo admin, em vez de exigir deploy de código para atualizar um número.
--
-- Tabela SINGLETON: existe uma única linha, com id fixo em 1. O
-- `check (id = 1)` é o que impõe isso — qualquer tentativa de inserir uma
-- segunda linha (id diferente de 1) quebra o CHECK, e a PK impede duplicar o
-- próprio id=1. Não há necessidade de mais de uma linha: as taxas valem para
-- todo o site, não por usuário/sessão.
--
-- ARMADILHA PRINCIPAL DO ARQUIVO: as taxas são guardadas em formato DECIMAL
-- (0.115 para 11,5% ao ano), não em percentual (11.5). É o mesmo formato que
-- os simuladores já usam em código (const TAXA_ANUAL = 0.115) e que as
-- fórmulas de lib/financeiro.ts esperam. Gravar 11.5 em vez de 0.115 nesta
-- tabela faria a parcela calculada sair ~100x errada, sem gerar nenhum erro
-- — o CHECK (< 1) abaixo existe justamente para pegar esse tipo de engano
-- antes que ele chegue ao banco.
--
-- numeric(8,6): escala 6 casas decimais, de propósito. A taxa mensal de home
-- equity (1,09% a.m. = 0.0109) precisa de 4 casas para representar "09" com
-- exatidão; escala 4 já seria suficiente para ela, mas escala 6 dá folga para
-- taxas mais finas (ex.: 1,095% a.m. = 0.010950) sem truncar.
--
-- Reaproveita a função public.set_updated_at() criada em
-- 001_schema_inicial_capital_imobiliario.sql (grava now() em NEW.updated_at
-- a cada UPDATE) — por isso a coluna se chama updated_at (inglês), no mesmo
-- padrão das demais tabelas com trigger, e não atualizado_em.
--
-- Rodar no SQL Editor do Supabase, depois de 012_lead_consentimento.sql.
-- =====================================================================

create table public.parametros_simulador (
  id smallint primary key default 1 check (id = 1),
  financiamento_taxa_anual numeric(8,6) not null
    check (financiamento_taxa_anual > 0 and financiamento_taxa_anual < 1),
  home_equity_taxa_mensal numeric(8,6) not null
    check (home_equity_taxa_mensal > 0 and home_equity_taxa_mensal < 1),
  updated_at timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);

create trigger trg_parametros_simulador_updated_at
  before update on public.parametros_simulador
  for each row execute function public.set_updated_at();

-- Seed com os valores atuais em produção (const TAXA_ANUAL e const
-- TAXA_MENSAL nos dois componentes de simulador), para que a migração não
-- mude nenhum número visível no site no momento em que é aplicada.
insert into public.parametros_simulador (id, financiamento_taxa_anual, home_equity_taxa_mensal)
values (1, 0.115, 0.0109);

-- ---------------------------------------------------------------------
-- RLS — mesmo padrão de CATEGORIES (001_schema_inicial_capital_imobiliario.sql):
-- leitura pública (o site público lê essa tabela com a chave anon, em
-- lib/queries/parametros.ts, via createStaticClient()), escrita só autenticado.
-- ---------------------------------------------------------------------
alter table public.parametros_simulador enable row level security;

create policy "parametros_simulador_public_read" on public.parametros_simulador
  for select using (true);

create policy "parametros_simulador_admin_write" on public.parametros_simulador
  for all using (auth.role() = 'authenticated');

-- =====================================================================
-- FIM — 013_parametros_simulador.sql
-- =====================================================================
