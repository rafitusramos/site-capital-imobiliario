-- =====================================================================
-- 021_rpc_colecoes_atomicas.sql
-- Gravação atômica das coleções filhas do imóvel (imagens, tipologias,
-- diferenciais, FAQs) e das tags do lead.
--
-- Antes, cada server action lia os ids existentes, apagava os que saíram
-- e gravava item a item em chamadas separadas. Uma falha no meio (rede,
-- constraint, timeout) deixava a coleção pela metade: itens apagados e
-- nenhum dos novos gravados. Agora cada coleção é UMA chamada de RPC, ou
-- seja, uma transação: ou grava tudo, ou nada.
--
-- Todas SECURITY INVOKER de propósito (como mover_lead_crm em 017): a RLS
-- continua valendo dentro da função. Elas não são um caminho para
-- escapar da policy — só juntam várias escritas numa transação. Quem não
-- é admin (020) recebe zero linhas visíveis / violação de RLS.
--
-- Ids existentes são PRESERVADOS (update por id, não delete + insert):
-- nenhuma tabela referencia essas linhas por FK, mas o id aparece em chave
-- React e em URLs de imagem do editor, e trocá-lo à toa só gera ruído.
-- Um id que não pertence ao imóvel informado é erro (ITEM_NAO_ENCONTRADO),
-- nunca "sequestro" de linha de outro imóvel.
--
-- Rodar no SQL Editor do Supabase, depois de 020_admin_somente_admin.sql.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- IMAGENS
-- ---------------------------------------------------------------------
create or replace function public.salvar_imovel_imagens(p_imovel_id uuid, p_itens jsonb)
returns void
language plpgsql security invoker
set search_path = public
as $$
declare v_item record; v_linhas int;
begin
  perform 1 from public.imoveis where id = p_imovel_id;
  if not found then raise exception 'IMOVEL_NAO_ENCONTRADO'; end if;

  delete from public.imovel_imagens
   where imovel_id = p_imovel_id
     and id not in (
       select (x->>'id')::uuid from jsonb_array_elements(p_itens) x where x->>'id' is not null
     );

  for v_item in
    select * from jsonb_to_recordset(p_itens)
      as t(id uuid, url text, ambiente text, grupo text, ordem int, destaque boolean)
  loop
    if v_item.id is not null then
      update public.imovel_imagens
         set url = v_item.url, ambiente = v_item.ambiente, grupo = v_item.grupo,
             ordem = coalesce(v_item.ordem, 0), destaque = coalesce(v_item.destaque, false)
       where id = v_item.id and imovel_id = p_imovel_id;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then raise exception 'ITEM_NAO_ENCONTRADO'; end if;
    else
      insert into public.imovel_imagens (imovel_id, url, ambiente, grupo, ordem, destaque)
      values (p_imovel_id, v_item.url, v_item.ambiente, v_item.grupo,
              coalesce(v_item.ordem, 0), coalesce(v_item.destaque, false));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- TIPOLOGIAS
-- ---------------------------------------------------------------------
create or replace function public.salvar_imovel_tipologias(p_imovel_id uuid, p_itens jsonb)
returns void
language plpgsql security invoker
set search_path = public
as $$
declare v_item record; v_linhas int;
begin
  perform 1 from public.imoveis where id = p_imovel_id;
  if not found then raise exception 'IMOVEL_NAO_ENCONTRADO'; end if;

  delete from public.imovel_tipologias
   where imovel_id = p_imovel_id
     and id not in (
       select (x->>'id')::uuid from jsonb_array_elements(p_itens) x where x->>'id' is not null
     );

  for v_item in
    select * from jsonb_to_recordset(p_itens)
      as t(id uuid, nome text, area numeric, dormitorios int, suites int, banheiros int,
           vagas int, valor_a_partir_de numeric, planta_url text, ordem int)
  loop
    if v_item.id is not null then
      update public.imovel_tipologias
         set nome = v_item.nome, area = v_item.area, dormitorios = v_item.dormitorios,
             suites = v_item.suites, banheiros = v_item.banheiros, vagas = v_item.vagas,
             valor_a_partir_de = v_item.valor_a_partir_de, planta_url = v_item.planta_url,
             ordem = coalesce(v_item.ordem, 0)
       where id = v_item.id and imovel_id = p_imovel_id;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then raise exception 'ITEM_NAO_ENCONTRADO'; end if;
    else
      insert into public.imovel_tipologias
        (imovel_id, nome, area, dormitorios, suites, banheiros, vagas, valor_a_partir_de, planta_url, ordem)
      values (p_imovel_id, v_item.nome, v_item.area, v_item.dormitorios, v_item.suites,
              v_item.banheiros, v_item.vagas, v_item.valor_a_partir_de, v_item.planta_url,
              coalesce(v_item.ordem, 0));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- DIFERENCIAIS
-- ---------------------------------------------------------------------
create or replace function public.salvar_imovel_diferenciais(p_imovel_id uuid, p_itens jsonb)
returns void
language plpgsql security invoker
set search_path = public
as $$
declare v_item record; v_linhas int;
begin
  perform 1 from public.imoveis where id = p_imovel_id;
  if not found then raise exception 'IMOVEL_NAO_ENCONTRADO'; end if;

  delete from public.imovel_diferenciais
   where imovel_id = p_imovel_id
     and id not in (
       select (x->>'id')::uuid from jsonb_array_elements(p_itens) x where x->>'id' is not null
     );

  for v_item in
    select * from jsonb_to_recordset(p_itens)
      as t(id uuid, grupo text, nome text, icone text, ordem int)
  loop
    if v_item.id is not null then
      update public.imovel_diferenciais
         set grupo = v_item.grupo, nome = v_item.nome, icone = v_item.icone,
             ordem = coalesce(v_item.ordem, 0)
       where id = v_item.id and imovel_id = p_imovel_id;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then raise exception 'ITEM_NAO_ENCONTRADO'; end if;
    else
      insert into public.imovel_diferenciais (imovel_id, grupo, nome, icone, ordem)
      values (p_imovel_id, v_item.grupo, v_item.nome, v_item.icone, coalesce(v_item.ordem, 0));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- FAQS
-- ---------------------------------------------------------------------
create or replace function public.salvar_imovel_faqs(p_imovel_id uuid, p_itens jsonb)
returns void
language plpgsql security invoker
set search_path = public
as $$
declare v_item record; v_linhas int;
begin
  perform 1 from public.imoveis where id = p_imovel_id;
  if not found then raise exception 'IMOVEL_NAO_ENCONTRADO'; end if;

  delete from public.imovel_faqs
   where imovel_id = p_imovel_id
     and id not in (
       select (x->>'id')::uuid from jsonb_array_elements(p_itens) x where x->>'id' is not null
     );

  for v_item in
    select * from jsonb_to_recordset(p_itens)
      as t(id uuid, pergunta text, resposta text, ordem int)
  loop
    if v_item.id is not null then
      update public.imovel_faqs
         set pergunta = v_item.pergunta, resposta = v_item.resposta,
             ordem = coalesce(v_item.ordem, 0)
       where id = v_item.id and imovel_id = p_imovel_id;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then raise exception 'ITEM_NAO_ENCONTRADO'; end if;
    else
      insert into public.imovel_faqs (imovel_id, pergunta, resposta, ordem)
      values (p_imovel_id, v_item.pergunta, v_item.resposta, coalesce(v_item.ordem, 0));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- TAGS DO LEAD
-- lead_tags tem PK composta (lead_id, tag_slug) e nada a preservar:
-- apaga as que saíram, insere as novas, ignora as que já existem.
-- Tag fora do catálogo crm_tags estoura a FK e desfaz tudo.
-- ---------------------------------------------------------------------
create or replace function public.definir_tags_lead(p_lead_id uuid, p_tags text[])
returns void
language plpgsql security invoker
set search_path = public
as $$
begin
  perform 1 from public.leads where id = p_lead_id;
  if not found then raise exception 'LEAD_NAO_ENCONTRADO'; end if;

  delete from public.lead_tags
   where lead_id = p_lead_id and tag_slug <> all (coalesce(p_tags, '{}'));

  insert into public.lead_tags (lead_id, tag_slug)
  select p_lead_id, t from unnest(coalesce(p_tags, '{}')) t
  on conflict do nothing;
end;
$$;

grant execute on function public.salvar_imovel_imagens(uuid, jsonb)       to authenticated;
grant execute on function public.salvar_imovel_tipologias(uuid, jsonb)    to authenticated;
grant execute on function public.salvar_imovel_diferenciais(uuid, jsonb)  to authenticated;
grant execute on function public.salvar_imovel_faqs(uuid, jsonb)          to authenticated;
grant execute on function public.definir_tags_lead(uuid, text[])          to authenticated;

commit;

-- =====================================================================
-- VERIFICAÇÃO (rodar depois, separado)
-- =====================================================================
--   select proname, prosecdef from pg_proc
--    where proname in ('salvar_imovel_imagens','salvar_imovel_tipologias',
--                      'salvar_imovel_diferenciais','salvar_imovel_faqs','definir_tags_lead');
--   -- prosecdef deve ser false nas cinco (security invoker).
