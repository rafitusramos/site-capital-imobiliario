-- =====================================================================
-- 008_imoveis_storage.sql
-- Storage do admin de imóveis — bucket de imagens dos empreendimentos
-- (galerias, decorado, plantas, implantação e logo da construtora).
-- Rodar no SQL Editor do Supabase, depois de 007_imoveis_empreendimentos.sql.
-- Espelha 004_admin_storage.sql, trocando só o id do bucket.
-- =====================================================================

-- =====================================================================
-- BUCKET: imovel-images
-- Público para leitura (as imagens aparecem no site), escrita restrita
-- a usuários autenticados (hoje, só o admin).
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imovel-images',
  'imovel-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- =====================================================================
-- POLICIES — storage.objects, escopadas ao bucket imovel-images
-- =====================================================================
create policy "imovel_images_public_read" on storage.objects
  for select using (bucket_id = 'imovel-images');

create policy "imovel_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'imovel-images' and auth.role() = 'authenticated');

create policy "imovel_images_admin_update" on storage.objects
  for update using (bucket_id = 'imovel-images' and auth.role() = 'authenticated');

create policy "imovel_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'imovel-images' and auth.role() = 'authenticated');

-- =====================================================================
-- FIM — 008_imoveis_storage.sql
-- Próximo: 009_seed_imovel_exemplo.sql
-- =====================================================================
