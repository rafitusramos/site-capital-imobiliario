-- =====================================================================
-- 027_imoveis_descricao_unidade.sql
-- Descrição da unidade para imóvel pronto.
--
-- 1. imoveis.descricao_unidade
--    Texto livre sobre a unidade à venda (ambientes, acabamento,
--    orientação solar). Só 'pronto' usa; nasce nula, então todo imóvel
--    existente segue exatamente como estava. No imóvel pronto, a coluna
--    descricao_completa (seção "O projeto" no lançamento) passa a ser a
--    descrição do CONDOMÍNIO — sem renomear coluna, sem tocar em dado.
--
-- 2. Galerias do pronto (sem mudança de banco)
--    imovel_imagens.grupo continua com os mesmos valores (check da 007):
--    'decorado' guarda as "Fotos da unidade" e 'empreendimento' as
--    "Fotos do condomínio". A capa do pronto é a primeira da unidade.
--
-- RLS: inalterada. As policies de escrita da 020 (eh_admin()) são por
-- tabela, não por coluna, e cobrem a coluna nova.
--
-- Rodar no SQL Editor do Supabase (ou pelo workflow de migrations). Sem
-- BEGIN/COMMIT: o CLI já envolve cada arquivo numa transação.
-- =====================================================================

alter table public.imoveis
  add column descricao_unidade text;

comment on column public.imoveis.descricao_unidade is
  'Descrição da unidade (só modalidade pronto). Em pronto, descricao_completa é a descrição do condomínio.';
