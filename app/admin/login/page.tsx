"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Marca } from "@/components/admin/Marca";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setCarregando(false);
      setErro("E-mail ou senha inválidos.");
      return;
    }

    router.replace("/admin/posts");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={aoEnviar}
        className="w-full max-w-sm rounded-lg border border-black/10 bg-[var(--branco)] p-8 shadow-sm"
      >
        <div className="mb-6">
          <Marca />
          <p className="mt-4 text-sm text-neutral-500">Painel Administrativo</p>
        </div>

        <label className="mb-1 block text-sm font-medium text-[var(--abissal)]" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]"
        />

        <label className="mb-1 block text-sm font-medium text-[var(--abissal)]" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          required
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]"
        />

        {erro ? <p className="mb-4 text-sm text-[var(--erro)]">{erro}</p> : null}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] disabled:opacity-60"
        >
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
