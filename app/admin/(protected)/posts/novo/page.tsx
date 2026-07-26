import type { Metadata } from "next";
import { getCategorias } from "@/lib/queries/admin-posts";
import { PostEditor } from "@/components/admin/PostEditor";

export const metadata: Metadata = { title: "Novo artigo · Admin" };

export default async function NovoPostPage() {
  const categorias = await getCategorias();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Novo artigo</h1>
      <PostEditor categorias={categorias} post={null} />
    </div>
  );
}
