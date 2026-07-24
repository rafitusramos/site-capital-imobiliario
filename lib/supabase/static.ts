import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cliente ANON sem cookies, seguro para chamar em qualquer contexto —
// inclusive generateStaticParams() e a pré-renderização SSG, que rodam em
// build time, fora do escopo de uma requisição (onde cookies() não existe).
export function createStaticClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
