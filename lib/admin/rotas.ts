/**
 * Destino padrão do painel administrativo.
 *
 * Três lugares precisam concordar sobre para onde mandar quem entra:
 * `app/admin/page.tsx` (quem digita /admin direto), `app/admin/login/page.tsx`
 * (logo após o login dar certo) e `lib/supabase/middleware.ts` (quem já está
 * logado e cai na tela de login). Enquanto eram três literais soltos, mudar o
 * destino exigia lembrar dos três — e esquecer um significa entrar pelo login e
 * cair numa tela, digitar /admin e cair em outra.
 *
 * O CRM é o padrão porque é a tela de trabalho diária; blog e imóveis são
 * cadastro esporádico.
 */
export const ADMIN_HOME = "/admin/crm";

/**
 * Mesma rota com barra final. `next.config.ts` usa `trailingSlash: true`, e o
 * middleware monta a URL de redirect à mão (`url.pathname = ...`) em vez de
 * passar por `redirect()` do Next — sem a barra, o Next responde com mais um
 * redirect de normalização, um salto a mais em toda entrada no admin.
 */
export const ADMIN_HOME_COM_BARRA = `${ADMIN_HOME}/`;
