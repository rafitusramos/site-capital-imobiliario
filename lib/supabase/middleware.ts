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

  if (user && ehLogin) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_HOME_COM_BARRA;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
