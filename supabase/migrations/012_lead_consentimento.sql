-- =====================================================================
-- 012_lead_consentimento.sql
-- Acrescenta o parâmetro p_consentimento_lgpd às três RPCs de criação de
-- lead (criar_lead_financiamento, criar_lead_home_equity, criar_lead_imovel)
-- e passa a gravar public.leads.consentimento_lgpd / consentimento_em, que
-- já existem desde 002_leads_crm.sql mas nunca eram preenchidos.
--
-- CUIDADO: `create or replace function` com uma assinatura de parâmetros
-- diferente da existente cria uma SOBRECARGA (overload) em vez de substituir
-- a função — e a chamada via supabase-js (que passa os parâmetros nomeados)
-- fica ambígua entre as duas versões. Por isso cada função é primeiro
-- removida (assinatura exata da versão em 003_lead_rpc_e_rate_limit.sql) e
-- só então recriada.
--
-- As três funções originais são `language plpgsql`, sem `security definer`
-- e sem `set search_path` — mantido aqui sem alteração. Nenhuma delas tinha
-- `grant execute` explícito em 003 (rodam via service_role, que ignora RLS
-- e já tem EXECUTE por padrão), então não há grant a replicar.
--
-- O parâmetro novo tem `default false` de propósito, por dois motivos: (1) faz
-- o deploy ser seguro em qualquer ordem — aplicada esta migration, o código
-- ainda em produção (que não envia o parâmetro) continua criando leads; (2)
-- `false` é o default honesto: significa "nenhum consentimento registrado",
-- não "consentimento presumido". A garantia de que todo lead novo tem
-- consentimento fica no servidor, em criarLead (app/actions/leads.ts), que
-- rejeita o envio antes de chegar aqui.
--
-- Rodar no SQL Editor do Supabase, depois de 011_imovel_tipos_fases.sql.
-- =====================================================================

drop function if exists public.criar_lead_financiamento(
  text, text, text, text, text, text, jsonb,
  numeric, numeric, numeric, numeric, int, numeric, numeric, boolean,
  text, text, text, text, text
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
  p_consentimento_lgpd boolean default false
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
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
    tipo_imovel, tipo_remuneracao, momento_compra, cidade, estado
  ) values (
    v_lead.id, p_valor_imovel, p_percentual_entrada, p_valor_entrada, p_valor_credito,
    p_prazo_meses, p_parcela_estimada, p_renda_mensal, p_usa_fgts,
    p_tipo_imovel, p_tipo_remuneracao, p_momento_compra, p_cidade, p_estado
  );

  return v_lead;
end;
$$;

drop function if exists public.criar_lead_home_equity(
  text, text, text, text, text, text, jsonb,
  numeric, boolean, numeric, numeric, int, numeric,
  text, text, numeric, text, text, text, numeric
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
  p_consentimento_lgpd boolean default false
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
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
    finalidade, tipo_imovel, renda_mensal, tipo_remuneracao, cep, numero, area_m2
  ) values (
    v_lead.id, p_valor_imovel_garantia, p_imovel_quitado, p_saldo_devedor,
    p_valor_credito_estimado, p_prazo_meses, p_parcela_estimada,
    p_finalidade, p_tipo_imovel, p_renda_mensal, p_tipo_remuneracao, p_cep, p_numero, p_area_m2
  );

  return v_lead;
end;
$$;

drop function if exists public.criar_lead_imovel(
  text, text, text, text, text, text, jsonb,
  uuid, text, text, text, numeric, boolean, text
);

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
  p_observacoes text,
  p_consentimento_lgpd boolean default false
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
begin
  insert into public.leads (
    tipo, nome, email, telefone, cpf, origem, pagina_url, utm, imovel_id,
    consentimento_lgpd, consentimento_em
  )
  values (
    'imoveis', p_nome, p_email, p_telefone, p_cpf, p_origem, p_pagina_url, coalesce(p_utm, '{}'::jsonb), p_imovel_id,
    p_consentimento_lgpd, case when p_consentimento_lgpd then now() else null end
  )
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
