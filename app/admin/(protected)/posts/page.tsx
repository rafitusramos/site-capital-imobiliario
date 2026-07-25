import Link from "next/link";
import type { Metadata } from "next";
import { getAllPostsAdmin } from "@/lib/queries/admin-posts";
import { TabelaPosts } from "@/components/admin/TabelaPosts";

export const metadata: Metadata = { title: "Artigos · Admin" };

export default async function AdminPostsPage() {
  const posts = await getAllPostsAdmin();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--abissal)]">Artigos do blog</h1>
        <Link
          href="/admin/posts/novo"
          className="rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840]"
        >
          + Novo artigo
        </Link>
      </div>
      <TabelaPosts posts={posts} />
    </div>
  );
}
