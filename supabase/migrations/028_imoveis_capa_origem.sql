-- =====================================================================
-- 028_imoveis_capa_origem.sql
-- Escolha da foto de capa do imóvel pronto.
--
-- 1. imoveis.capa_origem
--    De qual galeria sai a capa (hero, card da listagem e og:image):
--    'unidade'    -> primeira das "Fotos da unidade" (imovel_imagens.grupo
--                    = 'decorado'); é o comportamento anterior e o padrão.
--    'condominio' -> primeira das "Fotos do condomínio" (grupo
--                    'empreendimento').
--    Se o grupo escolhido estiver vazio, o site usa o outro. Só a
--    modalidade 'pronto' lê a coluna; lançamento usa sempre a galeria do
--    empreendimento. Nasce 'unidade', então todo imóvel existente segue
--    exatamente como estava.
--
-- RLS: inalterada. As policies de escrita da 020 (eh_admin()) são por
-- tabela, não por coluna, e cobrem a coluna nova.
--
-- Rodar no SQL Editor do Supabase (ou pelo workflow de migrations). Sem
-- BEGIN/COMMIT: o CLI já envolve cada arquivo numa transação.
-- =====================================================================

alter table public.imoveis
  add column capa_origem text not null default 'unidade'
    check (capa_origem in ('unidade', 'condominio'));

comment on column public.imoveis.capa_origem is
  'Origem da capa do imóvel pronto: unidade (grupo decorado) ou condominio (grupo empreendimento). Só modalidade pronto usa; lançamento sempre usa a galeria do empreendimento.';
