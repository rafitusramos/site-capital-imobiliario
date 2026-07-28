-- =====================================================================
-- 010_imovel_valor_sob_consulta.sql
-- Permite ocultar o preço na LP do empreendimento. Quando marcado, a LP
-- e os cards exibem "Sob consulta" no lugar do valor — usado em lançamento
-- cujo preço ainda não é público ou varia demais por unidade.
-- Rodar no SQL Editor do Supabase.
-- =====================================================================

alter table public.imoveis
  add column if not exists valor_sob_consulta boolean not null default false;

-- =====================================================================
-- FIM — 010_imovel_valor_sob_consulta.sql
-- =====================================================================
