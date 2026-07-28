import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategorias, getPostByIdAdmin } from "@/lib/queries/admin-posts";
import { PostEditor } from "@/components/admin/PostEditor";

export const metadata: Metadata = { title: "Editar artigo · Admin" };

type PaginaEditarPostProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarPostPage({ params }: PaginaEditarPostProps) {
  const { id } = await params;
  const [post, categorias] = await Promise.all([getPostByIdAdmin(id), getCategorias()]);

  if (!post) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-[var(--abissal)]">Editar artigo</h1>
      <PostEditor categorias={categorias} post={post} />
    </div>
  );
}
