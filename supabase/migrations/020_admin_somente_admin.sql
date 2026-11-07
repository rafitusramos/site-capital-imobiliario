-- =====================================================================
-- 020_admin_somente_admin.sql
-- Fase 1 de segurança do admin. Duas falhas se combinavam:
--
--  (a) As policies de escrita de conteúdo (posts, imóveis, categorias,
--      parâmetros do simulador e buckets de imagem) usavam
--      `auth.role() = 'authenticated'`: qualquer usuário logado — inclusive
--      um corretor — escrevia em tudo. A RLS do CRM (017) já distingue
--      admin de corretor via eh_admin(); o resto do admin ficou para trás.
--  (b) `profiles` tinha a policy `profiles_update_own` e privilégio de
--      UPDATE em TODAS as colunas para anon e authenticated. Qualquer
--      logado podia rodar `update profiles set role = 'admin'` na própria
--      linha e, com isso, passar em eh_admin() e em toda policy abaixo.
--      Corrigir só (a) sem (b) não protege nada.
--
-- Tudo numa transação: nunca existe uma janela sem policy de escrita
-- (RLS ligada + zero policy = ninguém escreve) nem com as duas convivendo
-- (policies do mesmo comando se combinam por OR, e a antiga venceria).
-- As policies de leitura pública (`*_public_read*`) não são tocadas.
--
-- eh_admin() é SECURITY DEFINER (017) e lê profiles por dentro, com os
-- privilégios do dono da função — não depende de grant ao chamador, então
-- revogar colunas de profiles abaixo não a afeta.
--
-- Rodar no SQL Editor do Supabase, depois de 019_imovel_originais_storage.sql.
-- =====================================================================

begin;

-- =====================================================================
-- 1. PROFILES — o usuário não pode mudar o próprio papel
-- A policy de linha (`profiles_update_own`) continua: cada um edita o
-- próprio perfil. O que muda é QUAIS colunas. `role` e `id` ficam fora do
-- grant; ninguém se promove pela API — só pelo SQL Editor (postgres),
-- que não passa por estes grants.
-- =====================================================================
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, creci) on public.profiles to authenticated;

-- O default de `role` era 'admin': todo perfil criado sem papel explícito
-- (ex.: cadastrar um corretor pelo Table Editor) nascia administrador.
-- O padrão passa a ser o papel de menor privilégio; admin é sempre explícito.
alter table public.profiles alter column role set default 'corretor';

-- =====================================================================
-- 2. TABELAS DE CONTEÚDO — escrita só para admin
-- =====================================================================
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "posts_admin_full_access" on public.posts;
create policy "posts_admin_full_access" on public.posts
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "imoveis_admin_full_access" on public.imoveis;
create policy "imoveis_admin_full_access" on public.imoveis
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "imovel_imagens_admin_full_access" on public.imovel_imagens;
create policy "imovel_imagens_admin_full_access" on public.imovel_imagens
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "imovel_tipologias_admin_full_access" on public.imovel_tipologias;
create policy "imovel_tipologias_admin_full_access" on public.imovel_tipologias
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "imovel_diferenciais_admin_full_access" on public.imovel_diferenciais;
create policy "imovel_diferenciais_admin_full_access" on public.imovel_diferenciais
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "imovel_faqs_admin_full_access" on public.imovel_faqs;
create policy "imovel_faqs_admin_full_access" on public.imovel_faqs
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "imovel_fases_admin_write" on public.imovel_fases;
create policy "imovel_fases_admin_write" on public.imovel_fases
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "imovel_tipos_admin_write" on public.imovel_tipos;
create policy "imovel_tipos_admin_write" on public.imovel_tipos
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "parametros_simulador_admin_write" on public.parametros_simulador;
create policy "parametros_simulador_admin_write" on public.parametros_simulador
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- =====================================================================
-- 3. STORAGE — buckets blog-images, imovel-images e imovel-images-originais
-- Mantém a condição de bucket E exige admin.
-- =====================================================================
drop policy if exists "blog_images_admin_insert" on storage.objects;
create policy "blog_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-images' and public.eh_admin());

drop policy if exists "blog_images_admin_update" on storage.objects;
create policy "blog_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'blog-images' and public.eh_admin())
  with check (bucket_id = 'blog-images' and public.eh_admin());

drop policy if exists "blog_images_admin_delete" on storage.objects;
create policy "blog_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-images' and public.eh_admin());

drop policy if exists "imovel_images_admin_insert" on storage.objects;
create policy "imovel_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imovel-images' and public.eh_admin());

drop policy if exists "imovel_images_admin_update" on storage.objects;
create policy "imovel_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'imovel-images' and public.eh_admin())
  with check (bucket_id = 'imovel-images' and public.eh_admin());

drop policy if exists "imovel_images_admin_delete" on storage.objects;
create policy "imovel_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imovel-images' and public.eh_admin());

drop policy if exists "imovel_images_originais_admin_insert" on storage.objects;
create policy "imovel_images_originais_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imovel-images-originais' and public.eh_admin());

drop policy if exists "imovel_images_originais_admin_select" on storage.objects;
create policy "imovel_images_originais_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'imovel-images-originais' and public.eh_admin());

drop policy if exists "imovel_images_originais_admin_update" on storage.objects;
create policy "imovel_images_originais_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'imovel-images-originais' and public.eh_admin())
  with check (bucket_id = 'imovel-images-originais' and public.eh_admin());

drop policy if exists "imovel_images_originais_admin_delete" on storage.objects;
create policy "imovel_images_originais_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imovel-images-originais' and public.eh_admin());

commit;

-- =====================================================================
-- VERIFICAÇÃO (rodar depois, separado)
-- =====================================================================
-- Nenhuma policy de escrita pode ter sobrado com auth.role() — deve voltar vazio:
--   select schemaname, tablename, policyname, cmd, qual
--     from pg_policies
--    where cmd <> 'SELECT'
--      and (qual ilike '%auth.role()%' or with_check ilike '%auth.role()%')
--      and schemaname in ('public', 'storage');
--
-- Todas as policies de escrita agora citam eh_admin():
--   select schemaname, tablename, policyname, cmd
--     from pg_policies
--    where policyname ~ '(admin|full_access)' and schemaname in ('public','storage')
--    order by 1, 2, 3;
--
-- O usuário não pode mais mudar o próprio papel — os três primeiros dão
-- false, o último true:
--   select has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE');
--   select has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE');
--   select has_column_privilege('anon',          'public.profiles', 'role', 'UPDATE');
--   select has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE');
