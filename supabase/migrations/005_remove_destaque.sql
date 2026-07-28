-- =====================================================================
-- 005_remove_destaque.sql
-- Remove public.posts.destaque — o "artigo em destaque" do blog agora é
-- sempre o mais recente publicado (fallback dinâmico já implementado no
-- app: components/blog/BlogFiltro.tsx), então o campo manual e o índice
-- que garantia um único destaque=true deixam de fazer sentido.
-- Rodar no SQL Editor do Supabase, na ordem em que aparece.
-- =====================================================================

drop index if exists public.idx_posts_destaque_unico;
alter table public.posts drop column if exists destaque;

-- =====================================================================
-- FIM — 005_remove_destaque.sql
-- =====================================================================
