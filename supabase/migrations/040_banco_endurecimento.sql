-- =====================================================================
-- 040_banco_endurecimento.sql
-- Endurecimento do banco apontado pelo advisor de segurança do Supabase
-- (conferido em produção em 2026-11-28). Nada aqui muda comportamento do site:
-- o formulário público grava com a service role, as páginas públicas só LEEM
-- com `anon`, e o admin grava com o cliente de cookies (papel `authenticated`).
--
-- O QUE MUDA
--  1. search_path fixo (`public, pg_temp`) em criar_lead_financiamento,
--     criar_lead_home_equity, criar_lead_imovel, registrar_tentativa_lead,
--     set_updated_at e log_lead_status_change (advisor
--     `function_search_path_mutable`). Os corpos (001, 002, 003, 017, 033) só
--     citam objetos de `public` e `auth.uid()` (qualificado); nenhum usa função
--     de extensão sem qualificar (uuid_generate_v4/nextval são DEFAULTs de
--     coluna, resolvidos por OID), então `extensions` não precisa entrar.
--  2. EXECUTE de funções:
--       criar_lead_imovel, registrar_tentativa_lead -> só service role
--         (como a 033 fez com os outros dois criar_lead_*);
--       salvar_imovel_diferenciais|faqs|imagens|tipologias -> só authenticated;
--       set_updated_at, ig_set_atualizado_em (triggers) -> ninguém precisa de
--         EXECUTE em tempo de disparo;
--       eh_admin() -> sai de public/anon, authenticated mantém (policies).
--     A service_role tem EXECUTE próprio em todas: nada é revogado dela.
--  3. Privilégios de tabela: `anon` perde INSERT/UPDATE/DELETE/TRUNCATE/
--     REFERENCES/TRIGGER nas tabelas de conteúdo/referência e em `profiles`
--     (a RLS barrava DML, mas TRUNCATE não passa por RLS); `lead_rate_limit`
--     fecha para anon e authenticated; `anon` e `authenticated` perdem
--     TRUNCATE/REFERENCES/TRIGGER em todas as tabelas do schema public.
--  4. Privilégios padrão (objetos futuros): tabelas novas nascem sem
--     escrita/TRUNCATE para `anon` e sem TRUNCATE/REFERENCES/TRIGGER para
--     `authenticated`; funções novas nascem sem EXECUTE para `anon`.
--     ATENÇÃO: RPC nova que o admin chama precisa de
--     `grant execute ... to authenticated` explícito.
--     Limite do Postgres: o `ALTER DEFAULT PRIVILEGES ... IN SCHEMA` só retira
--     entradas daquele schema (as que o Supabase concede a anon/authenticated);
--     o EXECUTE de PUBLIC vem do padrão GLOBAL e não se remove por schema. Por
--     isso função nova continua exigindo `revoke execute ... from public, anon`
--     na própria migration (regra que já existia). Não mexemos no padrão global
--     para não afetar extensões/outros schemas.
--  5. Storage: as policies `blog_images_public_read` e
--     `imovel_images_public_read` (SELECT para `public` no bucket inteiro)
--     deixavam qualquer um LISTAR todos os objetos, inclusive imagens de post
--     e imóvel não publicados. Bucket público serve
--     `/storage/v1/object/public/...` sem policy de SELECT, então o site,
--     o next/image e o og:image seguem iguais. No lugar: SELECT só para admin
--     (`blog_images_admin_select`, `imovel_images_admin_select`).
--  6. pg_cron `leads-limpar-rate-limit` (diário): apaga linhas de
--     `lead_rate_limit` com mais de 7 dias (a janela é de 1 h; nunca era limpa).
--  7. Índices nas FKs usadas em join: leads(imovel_id) e
--     crm_lembretes(interacao_id).
--
-- O QUE NÃO MUDA, DE PROPÓSITO (risco aceito)
--  - Nenhum SELECT é revogado de anon/authenticated (páginas públicas leem com
--    anon; consulta que embute `profiles` passaria a dar erro).
--  - INSERT/UPDATE/DELETE de `authenticated` e os grants de coluna de
--    `profiles` (020) ficam como estão: a RLS governa.
--  - eh_membro_crm() e ig_apagar_eventos_do_contato() seguem SECURITY DEFINER
--    executáveis por authenticated, por desenho (a segunda confere eh_admin()).
--  - `pg_net` fica no schema public (não é relocável; mover quebraria o job
--    `ig-disparar`).
--  - ig_eventos, wa_eventos e lead_rate_limit têm RLS sem policy de propósito
--    (só a service role).
--
-- Sem BEGIN/COMMIT: a CLI já abre uma transação por arquivo.
-- Reverter: ver o bloco de rollback na descrição do PR.
-- =====================================================================


-- 1. search_path fixo -------------------------------------------------
alter function public.criar_lead_financiamento(
  text, text, text, text, text, text, jsonb,
  numeric, numeric, numeric, numeric, int, numeric, numeric, boolean,
  text, text, text, text, text, boolean, date
) set search_path = public, pg_temp;

alter function public.criar_lead_home_equity(
  text, text, text, text, text, text, jsonb,
  numeric, boolean, numeric, numeric, int, numeric, text, text,
  numeric, text, text, text, numeric, boolean, date
) set search_path = public, pg_temp;

alter function public.criar_lead_imovel(
  text, text, text, text, text, text, jsonb,
  uuid, text, text, text, numeric, boolean, text, boolean
) set search_path = public, pg_temp;

alter function public.registrar_tentativa_lead(text) set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.log_lead_status_change() set search_path = public, pg_temp;


-- 2. EXECUTE de funções -----------------------------------------------
-- Só a service role chama (formulário público e limitador de tentativas).
revoke execute on function public.criar_lead_imovel(
  text, text, text, text, text, text, jsonb,
  uuid, text, text, text, numeric, boolean, text, boolean
) from public, anon, authenticated;

revoke execute on function public.registrar_tentativa_lead(text)
  from public, anon, authenticated;

-- RPCs do admin: authenticated mantém (grant da 021); public/anon saem.
revoke execute on function public.salvar_imovel_imagens(uuid, jsonb)      from public, anon;
revoke execute on function public.salvar_imovel_tipologias(uuid, jsonb)   from public, anon;
revoke execute on function public.salvar_imovel_diferenciais(uuid, jsonb) from public, anon;
revoke execute on function public.salvar_imovel_faqs(uuid, jsonb)         from public, anon;

-- Funções de trigger: o disparo não exige EXECUTE de quem faz o DML.
revoke execute on function public.set_updated_at()        from public, anon, authenticated;
revoke execute on function public.ig_set_atualizado_em()  from public, anon, authenticated;

-- eh_admin() é chamada pelas policies como authenticated; anon não precisa.
revoke execute on function public.eh_admin() from public, anon;
grant  execute on function public.eh_admin() to authenticated;


-- 3. Privilégios de tabela --------------------------------------------
revoke insert, update, delete, truncate, references, trigger on table
  public.categories,
  public.imoveis,
  public.imovel_diferenciais,
  public.imovel_faqs,
  public.imovel_fases,
  public.imovel_imagens,
  public.imovel_tipologias,
  public.imovel_tipos,
  public.lead_tipos,
  public.parametros_simulador,
  public.posts
from anon;

-- O UPDATE por coluna da 020 (full_name, phone, avatar_url, creci) não é tocado.
revoke insert, delete, truncate, references, trigger on table public.profiles from anon;

revoke all on table public.lead_rate_limit from anon, authenticated;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;


-- 4. Privilégios padrão para objetos futuros --------------------------
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;


-- 5. Storage: sem listagem pública nos buckets públicos ---------------
drop policy if exists "blog_images_public_read" on storage.objects;
drop policy if exists "imovel_images_public_read" on storage.objects;

drop policy if exists "blog_images_admin_select" on storage.objects;
create policy "blog_images_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'blog-images' and public.eh_admin());

drop policy if exists "imovel_images_admin_select" on storage.objects;
create policy "imovel_images_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'imovel-images' and public.eh_admin());


-- 6. Expurgo diário do rate limit -------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'leads-limpar-rate-limit') then
    perform cron.unschedule('leads-limpar-rate-limit');
  end if;
end;
$$;

-- destrutivo: aprovado
-- (a marca acima é para o guarda de CI: o `delete from` do job abaixo é o
-- expurgo intencional de lead_rate_limit, linhas com mais de 7 dias.)
-- 06:30 UTC = 03:30 America/Sao_Paulo.
select cron.schedule(
  'leads-limpar-rate-limit',
  '30 6 * * *',
  $$delete from public.lead_rate_limit where janela_inicio < now() - interval '7 days'$$
);


-- 7. Índices nas FKs usadas em join -----------------------------------
create index if not exists idx_leads_imovel_id
  on public.leads (imovel_id);
create index if not exists idx_crm_lembretes_interacao_id
  on public.crm_lembretes (interacao_id);
