-- =====================================================================
-- 003_lead_rpc_e_rate_limit.sql
-- RPCs de inserção atômica de lead + tabela de rate limiting por IP
-- Suporte à Server Action app/actions/leads.ts (captação via Supabase).
-- Rodar no SQL Editor do Supabase, depois de 002_leads_crm.sql.
-- =====================================================================

-- =====================================================================
-- CAMPOS VISÍVEIS SEM COLUNA CORRESPONDENTE NO SCHEMA COPIADO DO PLANO
-- Os formulários de financiamento e home-equity (mantidos visualmente
-- idênticos, conforme instrução) coletam tipo_remuneracao/momento_compra/
-- cidade/estado (financiamento) e tipo_remuneracao/cep/numero/area_m2
-- (home-equity), que não existem em 002_leads_crm.sql. Adição aditiva,
-- não mexe em nenhuma coluna já criada.
-- =====================================================================
alter table public.lead_financiamento
  add column tipo_remuneracao text,
  add column momento_compra  text,
  add column cidade          text,
  add column estado          text;

alter table public.lead_home_equity
  add column tipo_remuneracao text,
  add column cep              text,
  add column numero           text,
  add column area_m2          numeric(10,2);

-- =====================================================================
-- RPCs DE INSERÇÃO ATÔMICA
-- Cada uma insere em public.leads e na tabela de detalhe correspondente
-- dentro da mesma transação implícita da função (ou tudo, ou nada).
-- Chamadas sempre via service_role (Server Action), que já ignora RLS.
-- =====================================================================

create or replace function public.criar_lead_financiamento(
  p_nome text,
  p_email text,
  p_telefone text,
  p_cpf text,
  p_origem text,
  p_pagina_url text,
  p_utm jsonb,
  p_valor_imovel numeric,
  p_percentual_entrada numeric,
  p_valor_entrada numeric,
  p_valor_credito numeric,
  p_prazo_meses int,
  p_parcela_estimada numeric,
  p_renda_mensal numeric,
  p_usa_fgts boolean,
  p_tipo_imovel text,
  p_tipo_remuneracao text,
  p_momento_compra text,
  p_cidade text,
  p_estado text
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
  insert into public.leads (tipo, nome, email, telefone, cpf, origem, pagina_url, utm)
  values ('financiamento', p_nome, p_email, p_telefone, p_cpf, p_origem, p_pagina_url, coalesce(p_utm, '{}'::jsonb))
  returning * into v_lead;

  insert into public.lead_financiamento (
    lead_id, valor_imovel, percentual_entrada, valor_entrada, valor_credito,
    prazo_meses, parcela_estimada, renda_mensal, usa_fgts,
    tipo_imovel, tipo_remuneracao, momento_compra, cidade, estado
  ) values (
    v_lead.id, p_valor_imovel, p_percentual_entrada, p_valor_entrada, p_valor_credito,
    p_prazo_meses, p_parcela_estimada, p_renda_mensal, p_usa_fgts,
    p_tipo_imovel, p_tipo_remuneracao, p_momento_compra, p_cidade, p_estado
  );

  return v_lead;
end;
$$;

create or replace function public.criar_lead_home_equity(
  p_nome text,
  p_email text,
  p_telefone text,
  p_cpf text,
  p_origem text,
  p_pagina_url text,
  p_utm jsonb,
  p_valor_imovel_garantia numeric,
  p_imovel_quitado boolean,
  p_saldo_devedor numeric,
  p_valor_credito_estimado numeric,
  p_prazo_meses int,
  p_parcela_estimada numeric,
  p_finalidade text,
  p_tipo_imovel text,
  p_renda_mensal numeric,
  p_tipo_remuneracao text,
  p_cep text,
  p_numero text,
  p_area_m2 numeric
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
  insert into public.leads (tipo, nome, email, telefone, cpf, origem, pagina_url, utm)
  values ('home-equity', p_nome, p_email, p_telefone, p_cpf, p_origem, p_pagina_url, coalesce(p_utm, '{}'::jsonb))
  returning * into v_lead;

  insert into public.lead_home_equity (
    lead_id, valor_imovel_garantia, imovel_quitado, saldo_devedor,
    valor_credito_estimado, prazo_meses, parcela_estimada,
    finalidade, tipo_imovel, renda_mensal, tipo_remuneracao, cep, numero, area_m2
  ) values (
    v_lead.id, p_valor_imovel_garantia, p_imovel_quitado, p_saldo_devedor,
    p_valor_credito_estimado, p_prazo_meses, p_parcela_estimada,
    p_finalidade, p_tipo_imovel, p_renda_mensal, p_tipo_remuneracao, p_cep, p_numero, p_area_m2
  );

  return v_lead;
end;
$$;

create or replace function public.criar_lead_imovel(
  p_nome text,
  p_email text,
  p_telefone text,
  p_cpf text,
  p_origem text,
  p_pagina_url text,
  p_utm jsonb,
  p_imovel_id uuid,
  p_forma_pagamento text,
  p_prazo_compra text,
  p_possui_entrada text,
  p_valor_entrada numeric,
  p_ja_tem_aprovacao boolean,
  p_observacoes text
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
  insert into public.leads (tipo, nome, email, telefone, cpf, origem, pagina_url, utm, imovel_id)
  values ('imoveis', p_nome, p_email, p_telefone, p_cpf, p_origem, p_pagina_url, coalesce(p_utm, '{}'::jsonb), p_imovel_id)
  returning * into v_lead;

  insert into public.lead_imovel (
    lead_id, forma_pagamento, prazo_compra, possui_entrada,
    valor_entrada, ja_tem_aprovacao, observacoes
  ) values (
    v_lead.id, p_forma_pagamento, p_prazo_compra, p_possui_entrada,
    p_valor_entrada, p_ja_tem_aprovacao, p_observacoes
  );

  return v_lead;
end;
$$;

-- =====================================================================
-- RATE LIMITING POR IP
-- Tabela isolada (não altera o schema já aplicado em 002). Janela fixa
-- de 1 hora: no máximo 5 tentativas por IP por hora corrente.
-- =====================================================================
create table public.lead_rate_limit (
  ip text not null,
  janela_inicio timestamptz not null,
  tentativas int not null default 0,
  primary key (ip, janela_inicio)
);

alter table public.lead_rate_limit enable row level security;
-- Nenhuma policy: só service_role (que ignora RLS) acessa esta tabela.

create or replace function public.registrar_tentativa_lead(p_ip text)
returns boolean
language plpgsql
as $$
declare
  v_janela timestamptz := date_trunc('hour', now());
  v_tentativas int;
begin
  insert into public.lead_rate_limit (ip, janela_inicio, tentativas)
  values (p_ip, v_janela, 1)
  on conflict (ip, janela_inicio)
  do update set tentativas = public.lead_rate_limit.tentativas + 1
  returning tentativas into v_tentativas;

  return v_tentativas <= 5;
end;
$$;
