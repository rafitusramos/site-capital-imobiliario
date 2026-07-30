/**
 * Captura de atribuição (UTMs + click IDs pagos + referrer) para os
 * formulários de lead.
 *
 * Por que sessionStorage e não cookie nem localStorage: cookie exigiria
 * mais aviso de privacidade para um dado que só serve para atribuir a
 * própria conversão; localStorage persistiria além da sessão e passaria a
 * "contaminar" visitas futuras não relacionadas com a campanha original.
 * sessionStorage é o meio-termo consciente — cobre a conversão que acontece
 * na mesma sessão (a grande maioria do tráfego pago) sem reter o dado além
 * do necessário.
 */

const CHAVE_SESSAO = "rt-atribuicao-v1";

const CAMPOS_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const CAMPOS_CLICK_ID = ["gclid", "fbclid", "wbraid", "gbraid"] as const;

/**
 * document.referrer só entra na atribuição quando é EXTERNO ao site (outro
 * domínio) — clique em wa.me, navegação interna entre páginas etc. não
 * devem se disfarçar de "origem" da visita.
 */
function referrerExterno(): string | undefined {
  if (typeof document === "undefined" || !document.referrer) return undefined;
  if (typeof window === "undefined") return undefined;
  try {
    const refUrl = new URL(document.referrer);
    if (refUrl.hostname === window.location.hostname) return undefined;
    return document.referrer;
  } catch {
    return undefined;
  }
}

function extrairDaUrl(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const dados: Record<string, string> = {};

  for (const campo of CAMPOS_UTM) {
    const valor = params.get(campo);
    if (valor) dados[campo] = valor;
  }
  for (const campo of CAMPOS_CLICK_ID) {
    const valor = params.get(campo);
    if (valor) dados[campo] = valor;
  }
  const referrer = referrerExterno();
  if (referrer) dados.referrer = referrer;

  return dados;
}

/**
 * Roda uma vez, na PRIMEIRA página vista da sessão (ver
 * components/analytics/CapturaAtribuicao.tsx, montado no layout do site).
 *
 * Primeiro toque vence: se a sessão já tem uma captura, uma navegação
 * posterior para outra página (sem os parâmetros de campanha na URL) NÃO
 * sobrescreve a atribuição original — é justamente o cenário que motivou
 * esta mudança (quem chega em /financiamento/?gclid=... e navega antes de
 * converter não pode perder a atribuição).
 */
export function capturarAtribuicaoNaEntrada(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(CHAVE_SESSAO)) return;
    const dados = extrairDaUrl(window.location.search);
    if (Object.keys(dados).length > 0) {
      window.sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(dados));
    }
  } catch {
    // sessionStorage pode estar indisponível (modo privado restritivo etc.)
    // — atribuição é "nice to have", nunca pode quebrar a navegação.
  }
}

/**
 * Lê a atribuição da sessão atual. Assinatura preservada de propósito:
 * `app/actions/leads.ts` e a coluna `utm` (jsonb) não mudam nesta tarefa.
 *
 * Se não houver nada em sessionStorage (ex.: `capturarAtribuicaoNaEntrada`
 * não rodou por algum motivo, ou não há período de sessão prévio, como em
 * testes que chamam esta função isoladamente), cai de volta para ler a URL
 * atual — mantém o comportamento anterior desta função como rede de
 * segurança.
 */
export function capturarUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const salvo = window.sessionStorage?.getItem(CHAVE_SESSAO);
    if (salvo) return JSON.parse(salvo) as Record<string, string>;
  } catch {
    // JSON corrompido ou sessionStorage indisponível — cai no fallback abaixo.
  }

  return extrairDaUrl(window.location.search);
}
