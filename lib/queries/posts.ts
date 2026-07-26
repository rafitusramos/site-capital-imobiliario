import { createStaticClient } from "@/lib/supabase/static";
import type { Database } from "@/types/database";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Categoria = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "name" | "slug"
>;

// O tipo Database é escrito à mão e não modela Relationships, então o
// postgrest-js não consegue inferir o formato do embed `categoria:categories(...)`.
// O cast abaixo reflete o shape real da resposta, confirmado em runtime.
export type PostComCategoria = Post & { categoria: Categoria | null };

const SELECT_COM_CATEGORIA = "*, categoria:categories(name, slug)";

export async function getPublishedPosts(): Promise<PostComCategoria[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COM_CATEGORIA)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PostComCategoria[];
}

export async function getPostBySlug(
  slug: string
): Promise<PostComCategoria | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COM_CATEGORIA)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PostComCategoria | null;
}

export async function getRelatedPosts(
  postId: string,
  categoryId: string,
  limit: number
): Promise<PostComCategoria[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COM_CATEGORIA)
    .eq("status", "published")
    .eq("category_id", categoryId)
    .neq("id", postId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PostComCategoria[];
}
