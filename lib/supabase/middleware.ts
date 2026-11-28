import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HOME_COM_BARRA } from "@/lib/admin/rotas";

const LOGIN_PATH = "/admin/login";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // next.config.ts usa trailingSlash:true, então o pathname real pode chegar
  // como "/admin/login/" — normaliza antes de comparar, senão a comparação
  // exata falha e gera um loop de redirect (login -> login/ -> login -> ...).
  const pathnameSemBarra = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  const ehLogin = pathnameSemBarra === LOGIN_PATH;

  if (!user && !ehLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `${LOGIN_PATH}/`;
    return NextResponse.redirect(url);
  }

  if (user) {
    // Sessão sem perfil = conta que não é da equipe (auto-cadastro reativado,
    // convite por engano). A RLS (migration 039) já não mostra nada a ela; aqui
    // encerramos a sessão e mandamos para o login com o aviso.
    const { data: perfil, error: erroPerfil } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (erroPerfil) {
      // Falha transitória não tranca o admin para fora: segue (layout e RLS protegem).
      console.error("[middleware] falha ao ler o perfil:", erroPerfil);
    } else if (!perfil) {
      await supabase.auth.signOut();
      // Na página de login só limpamos a sessão (sem redirect, sem loop).
      if (ehLogin) return supabaseResponse;

      const url = request.nextUrl.clone();
      url.pathname = `${LOGIN_PATH}/`;
      url.search = "?acesso=negado";
      const redirecionamento = NextResponse.redirect(url);
      // O signOut grava os cookies limpos em `supabaseResponse`: sem copiá-los
      // para o redirect, o navegador mantém a sessão.
      supabaseResponse.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
      return redirecionamento;
    }
  }

  if (user && ehLogin) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_HOME_COM_BARRA;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
