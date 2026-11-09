-- =====================================================================
-- 032_lead_data_nascimento.sql
-- Data de nascimento do lead de financiamento e de home equity (a idade entra
-- no seguro MIP, que muda a parcela). Coluna `data_nascimento date` em
-- lead_financiamento e lead_home_equity, gravada pelos RPCs criar_lead_*.
-- O RPC de imóveis (criar_lead_imovel) NÃO muda.
--
-- Sobrecarga: como em 012, `create or replace` com assinatura diferente criaria
-- um OVERLOAD e a chamada nomeada do supabase-js ficaria ambígua. Por isso cada
-- função antiga (assinatura exata da 012) é removida antes de recriar.
-- Grants/security: iguais aos de hoje — plpgsql, sem security definer, sem
-- grant explícito (roda via service_role). Nada a replicar.
--
-- O parâmetro novo é `default null`, de propósito: o código anterior (que não
-- envia p_data_nascimento) continua criando leads depois desta migration. A
-- obrigatoriedade para o lead novo fica na validação do servidor (zod); no banco
-- a coluna é nullable porque os leads antigos não têm a data. O banco rejeita
-- data futura (data de hoje em America/Sao_Paulo).
-- Sem begin/commit: a CLI já abre uma transação por arquivo.
-- =====================================================================

alter table public.lead_financiamento add column if not exists data_nascimento date;
alter table public.lead_home_equity   add column if not exists data_nascimento date;

drop function if exists public.criar_lead_financiamento(
  text, text, text, text, text, text, jsonb,
  numeric, numeric, numeric, numeric, int, numeric, numeric, boolean,
  text, text, text, text, text, boolean
);

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
  p_estado text,
  p_consentimento_lgpd boolean default false,
  p_data_nascimento date default null
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
  if p_data_nascimento is not null and p_data_nascimento > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'data_nascimento no futuro' using errcode = '22023';
  end if;

  insert into public.leads (
    tipo, nome, email, telefone, cpf, origem, pagina_url, utm,
    consentimento_lgpd, consentimento_em
  )
  values (
    'financiamento', p_nome, p_email, p_telefone, p_cpf, p_origem, p_pagina_url, coalesce(p_utm, '{}'::jsonb),
    p_consentimento_lgpd, case when p_consentimento_lgpd then now() else null end
  )
  returning * into v_lead;

  insert into public.lead_financiamento (
    lead_id, valor_imovel, percentual_entrada, valor_entrada, valor_credito,
    prazo_meses, parcela_estimada, renda_mensal, usa_fgts,
    tipo_imovel, tipo_remuneracao, momento_compra, cidade, estado, data_nascimento
  ) values (
    v_lead.id, p_valor_imovel, p_percentual_entrada, p_valor_entrada, p_valor_credito,
    p_prazo_meses, p_parcela_estimada, p_renda_mensal, p_usa_fgts,
    p_tipo_imovel, p_tipo_remuneracao, p_momento_compra, p_cidade, p_estado, p_data_nascimento
  );

  return v_lead;
end;
$$;

drop function if exists public.criar_lead_home_equity(
  text, text, text, text, text, text, jsonb,
  numeric, boolean, numeric, numeric, int, numeric,
  text, text, numeric, text, text, text, numeric, boolean
);

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
  p_area_m2 numeric,
  p_consentimento_lgpd boolean default false,
  p_data_nascimento date default null
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
  if p_data_nascimento is not null and p_data_nascimento > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'data_nascimento no futuro' using errcode = '22023';
  end if;

  insert into public.leads (
    tipo, nome, email, telefone, cpf, origem, pagina_url, utm,
    consentimento_lgpd, consentimento_em
  )
  values (
    'home-equity', p_nome, p_email, p_telefone, p_cpf, p_origem, p_pagina_url, coalesce(p_utm, '{}'::jsonb),
    p_consentimento_lgpd, case when p_consentimento_lgpd then now() else null end
  )
  returning * into v_lead;

  insert into public.lead_home_equity (
    lead_id, valor_imovel_garantia, imovel_quitado, saldo_devedor,
    valor_credito_estimado, prazo_meses, parcela_estimada,
    finalidade, tipo_imovel, renda_mensal, tipo_remuneracao, cep, numero, area_m2, data_nascimento
  ) values (
    v_lead.id, p_valor_imovel_garantia, p_imovel_quitado, p_saldo_devedor,
    p_valor_credito_estimado, p_prazo_meses, p_parcela_estimada,
    p_finalidade, p_tipo_imovel, p_renda_mensal, p_tipo_remuneracao, p_cep, p_numero, p_area_m2, p_data_nascimento
  );

  return v_lead;
end;
$$;
