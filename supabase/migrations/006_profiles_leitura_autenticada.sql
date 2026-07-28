-- =====================================================================
-- 006_profiles_leitura_autenticada.sql
-- Permite que qualquer usuário autenticado leia todos os profiles (nome +
-- avatar), não só o próprio. Necessário pro admin mostrar autor de posts
-- escritos por outra pessoa (hoje só existe 1 admin, então isso passava
-- despercebido, mas quebra assim que houver um segundo autor).
-- Rodar no SQL Editor do Supabase. Não remove a policy "profiles_select_own"
-- existente — as duas convivem (RLS aplica OR entre policies do mesmo comando).
-- =====================================================================

create policy "profiles_read_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

-- =====================================================================
-- FIM — 006_profiles_leitura_autenticada.sql
-- =====================================================================
