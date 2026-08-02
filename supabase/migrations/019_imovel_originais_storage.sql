-- =====================================================================
-- 019_imovel_originais_storage.sql
-- Storage do admin de imóveis — bucket dos originais sem marca d'água,
-- guardados à parte para permitir refazer o selo depois sem perder a
-- imagem-fonte. Rodar no SQL Editor do Supabase, depois de
-- 018 (a migration corrente até aqui).
-- Espelha 008_imoveis_storage.sql, trocando id do bucket, `public` para
-- false e removendo a policy de leitura pública.
-- =====================================================================

-- =====================================================================
-- BUCKET: imovel-images-originais
-- Privado: nada de leitura pública. Só o admin autenticado lê, grava e
-- apaga — é material bruto, não o que a LP serve.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imovel-images-originais',
  'imovel-images-originais',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- =====================================================================
-- POLICIES — storage.objects, escopadas ao bucket imovel-images-originais
-- Sem policy de select público: select, insert, update e delete exigem
-- `authenticated`.
-- =====================================================================
create policy "imovel_images_originais_admin_select" on storage.objects
  for select using (bucket_id = 'imovel-images-originais' and auth.role() = 'authenticated');

create policy "imovel_images_originais_admin_insert" on storage.objects
  for insert with check (bucket_id = 'imovel-images-originais' and auth.role() = 'authenticated');

create policy "imovel_images_originais_admin_update" on storage.objects
  for update using (bucket_id = 'imovel-images-originais' and auth.role() = 'authenticated');

create policy "imovel_images_originais_admin_delete" on storage.objects
  for delete using (bucket_id = 'imovel-images-originais' and auth.role() = 'authenticated');

-- =====================================================================
-- FIM — 019_imovel_originais_storage.sql
-- =====================================================================
