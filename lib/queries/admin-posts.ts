import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Categoria = Database["public"]["Tables"]["categories"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type PostAdmin = Post & {
  categoria: Pick<Categoria, "name" | "slug"> | null;
  autor: Pick<Profile, "full_name" | "avatar_url"> | null;
};

const SELECT_COM_CATEGORIA_E_AUTOR =
  "*, categoria:categories(name, slug), autor:profiles(full_name, avatar_url)";

/** Todos os posts, qualquer status — só para uso no admin. Mais recente criado primeiro. */
export async function getAllPostsAdmin(): Promise<PostAdmin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COM_CATEGORIA_E_AUTOR)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PostAdmin[];
}

export async function getPostByIdAdmin(id: string): Promise<PostAdmin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COM_CATEGORIA_E_AUTOR)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PostAdmin | null;
}

export async function getCategorias(): Promise<Categoria[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");

  if (error) throw error;
  return data ?? [];
}
