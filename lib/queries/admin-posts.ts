import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Categoria = Database["public"]["Tables"]["categories"]["Row"];

export type PostAdmin = Post & {
  categoria: Pick<Categoria, "name" | "slug"> | null;
};

const SELECT_COM_CATEGORIA = "*, categoria:categories(name, slug)";

/** Todos os posts, qualquer status — só para uso no admin. */
export async function getAllPostsAdmin(): Promise<PostAdmin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COM_CATEGORIA)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PostAdmin[];
}

export async function getPostByIdAdmin(id: string): Promise<PostAdmin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COM_CATEGORIA)
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
