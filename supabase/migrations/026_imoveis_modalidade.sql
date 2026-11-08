-- =====================================================================
-- 026_imoveis_modalidade.sql
-- Imóvel pronto / unidade única na mesma tabela `imoveis`.
--
-- 1. imoveis.modalidade
--    Discriminador: 'lancamento' (empreendimento com tipologias, faixas
--    min/max, fases de obra) ou 'pronto' (uma unidade só, valores
--    únicos). Nasce 'lancamento' — todo imóvel existente continua
--    exatamente como estava. Mesma tabela, mesma listagem (/imoveis/),
--    mesma rota de detalhe (/imoveis/<slug>/): nenhuma URL nova.
--
-- 2. Colunas da unidade única (todas nullable; só 'pronto' as usa):
--    area_util, area_total, dormitorios, suites, banheiros, vagas,
--    valor_venda, valor_condominio, valor_iptu, nome_condominio, andar,
--    mobiliado, ano_construcao, exibir_endereco (default false: o
--    endereço exato só aparece na página se o cadastro liberar).
--
-- 3. imoveis.video_data_publicacao
--    Data de publicação do vídeo do YouTube, para o campo `uploadDate`
--    do VideoObject (obrigatório no schema.org/Google). Vale para as
--    duas modalidades. Sem ela o VideoObject não é emitido.
--
-- 4. Consistência fase x modalidade
--    Para modalidade = 'pronto', fase_id TEM de ser a fase 'pronto' de
--    imovel_fases (seed da 011). O trigger abaixo força isso em insert e
--    update, e a server action salvarImovel também preenche — o trigger
--    é a rede de segurança contra gravação direta pelo SQL Editor. Para
--    'lancamento' o trigger não mexe na fase.
--
-- RLS: inalterada. As policies de escrita da 020 (eh_admin()) são por
-- tabela, não por coluna, e cobrem as colunas novas.
--
-- Rodar no SQL Editor do Supabase (ou pelo workflow de migrations). Sem
-- BEGIN/COMMIT: o CLI já envolve cada arquivo numa transação.
-- =====================================================================

-- 1. modalidade --------------------------------------------------------
alter table public.imoveis
  add column modalidade text not null default 'lancamento'
  check (modalidade in ('lancamento', 'pronto'));

comment on column public.imoveis.modalidade is
  'lancamento = empreendimento (tipologias, faixas); pronto = unidade única. Espelhado em lib/imoveis/modalidade.ts.';

-- 2. unidade única -----------------------------------------------------
alter table public.imoveis
  add column area_util         numeric,
  add column area_total        numeric,
  add column dormitorios       int,
  add column suites            int,
  add column banheiros         int,
  add column vagas             int,
  add column valor_venda       numeric,
  add column valor_condominio  numeric,
  add column valor_iptu        numeric,
  add column nome_condominio   text,
  add column andar             int,
  add column mobiliado         boolean,
  add column ano_construcao    int,
  add column exibir_endereco   boolean not null default false;

-- 3. vídeo -------------------------------------------------------------
alter table public.imoveis
  add column video_data_publicacao date;

comment on column public.imoveis.video_data_publicacao is
  'Data de publicação do vídeo do YouTube (uploadDate do VideoObject). Sem ela o VideoObject não é emitido.';

-- 4. fase x modalidade -------------------------------------------------
create or replace function public.imoveis_fase_pronto()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.modalidade = 'pronto' then
    select id into new.fase_id from public.imovel_fases where slug = 'pronto';
    if new.fase_id is null then
      raise exception 'FASE_PRONTO_NAO_ENCONTRADA';
    end if;
  end if;
  return new;
end;
$$;

create trigger imoveis_fase_pronto
  before insert or update on public.imoveis
  for each row execute function public.imoveis_fase_pronto();

-- Função de trigger não é chamável pela API (mesmo padrão da 0181).
revoke execute on function public.imoveis_fase_pronto() from public, anon, authenticated;
