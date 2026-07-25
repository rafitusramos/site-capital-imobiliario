-- =====================================================================
-- 004_admin_storage.sql
-- Storage do admin do blog — bucket de imagens de capa dos posts
-- Origem: plano do admin do blog (Etapa 8 da migração)
-- Rodar no SQL Editor do Supabase, na ordem em que aparece.
-- Pré-requisito: schema_inicial_capital_imobiliario.sql já aplicado
-- (tabela public.profiles, usada para checar authenticated).
-- =====================================================================

-- =====================================================================
-- BUCKET: blog-images
-- Público para leitura (as imagens aparecem no site), escrita restrita
-- a usuários autenticados (hoje, só o admin).
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- =====================================================================
-- POLICIES — storage.objects, escopadas ao bucket blog-images
-- =====================================================================
create policy "blog_images_public_read" on storage.objects
  for select using (bucket_id = 'blog-images');

create policy "blog_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'blog-images' and auth.role() = 'authenticated');

create policy "blog_images_admin_update" on storage.objects
  for update using (bucket_id = 'blog-images' and auth.role() = 'authenticated');

create policy "blog_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'blog-images' and auth.role() = 'authenticated');

-- =====================================================================
-- FIM — 004_admin_storage.sql
-- =====================================================================
