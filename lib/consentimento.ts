/**
 * Máquina de estado do consentimento de cookies/rastreamento (LGPD + Fase 1
 * de medição — GA4, Google Ads, Meta Pixel). Não depende de React: é lida e
 * escrita tanto pelo banner (components/consentimento/BannerConsentimento)
 * quanto pelas tags de analytics (components/analytics/Tags), que reagem a
 * mudanças via o CustomEvent disparado em `definirConsentimento`/
 * `limparConsentimento` — sem precisar recarregar a página.
 */

export type EstadoConsentimento = "aceito" | "recusado" | null;

/**
 * Chave versionada: se um dia mudarmos o que "aceitar" significa (novas
 * ferramentas, nova política), basta subir para `-v2` que todo mundo volta
 * a ver o banner, em vez de herdar silenciosamente uma escolha antiga feita
 * sob termos diferentes.
 */
const CHAVE_ARMAZENAMENTO = "rt-consentimento-v1";

const NOME_EVENTO = "rt:consentimento-mudou";

/** Nome do evento e chave de storage exportados para quem precisar ouvir/inspecionar diretamente. */
export const EVENTO_CONSENTIMENTO = NOME_EVENTO;
export const CHAVE_CONSENTIMENTO = CHAVE_ARMAZENAMENTO;

/**
 * Fallback em memória para quando o localStorage é inacessível.
 *
 * `window.localStorage` não apenas "pode estar vazio": o ACESSO em si lança
 * SecurityError quando o navegador bloqueia armazenamento do site (modo
 * privado restritivo, política corporativa, "bloquear dados de sites" ligado).
 * Sem tratamento, essa exceção subia pelo useEffect de Tags e do banner e
 * derrubava os dois de uma vez — resultado observado em navegador real: nem
 * as tags carregavam, nem o banner aparecia, sem nenhum aviso. Guardar o
 * estado em memória faz a escolha valer pelo menos durante a navegação atual.
 */
let estadoEmMemoria: EstadoConsentimento = null;

/**
 * Seguro para SSR (no servidor não há localStorage) e seguro contra
 * armazenamento bloqueado. Quando não é possível ler, devolve o que estiver
 * em memória — e, na falta dos dois, `null`, que na postura opt-out significa
 * "as tags rodam e o banner aparece". É o comportamento correto: se não
 * conseguimos lembrar a escolha da pessoa, o certo é perguntar de novo, não
 * silenciar tudo.
 */
export function lerConsentimento(): EstadoConsentimento {
  if (typeof window === "undefined") return null;
  try {
    const valor = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
    // Storage legível é a fonte da verdade: valor ausente ou corrompido
    // significa "ainda não respondeu", e NÃO se cai para a memória. O
    // fallback em memória serve exclusivamente ao caso em que o acesso ao
    // storage falha (catch abaixo) — misturar os dois faria uma escolha
    // antiga em memória sobrepor um storage que foi legitimamente limpo.
    return valor === "aceito" || valor === "recusado" ? valor : null;
  } catch {
    return estadoEmMemoria;
  }
}

/**
 * Grava a escolha e avisa os componentes montados (Tags, banner) sem
 * precisar de reload. A gravação é "melhor esforço": se o localStorage
 * estiver bloqueado, o estado ainda vale em memória e o evento é disparado
 * de qualquer forma — uma recusa precisa surtir efeito imediato mesmo que
 * não sobreviva ao recarregamento da página.
 */
export function definirConsentimento(estado: "aceito" | "recusado"): void {
  if (typeof window === "undefined") return;
  estadoEmMemoria = estado;
  try {
    window.localStorage.setItem(CHAVE_ARMAZENAMENTO, estado);
  } catch {
    // Sem persistência: vale só nesta navegação, via estadoEmMemoria.
  }
  window.dispatchEvent(new CustomEvent<EstadoConsentimento>(NOME_EVENTO, { detail: estado }));
}

/**
 * Apaga a escolha registrada, fazendo o estado voltar a `null` — é o que o
 * link "Cookies e privacidade" do rodapé usa para reabrir o banner e deixar
 * a pessoa mudar de ideia depois. Sem isso a escolha seria irreversível.
 */
export function limparConsentimento(): void {
  if (typeof window === "undefined") return;
  estadoEmMemoria = null;
  try {
    window.localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  } catch {
    // Mesmo motivo de definirConsentimento: sem persistência, o reset vale
    // em memória e o evento abaixo reabre o banner na hora.
  }
  window.dispatchEvent(new CustomEvent<EstadoConsentimento>(NOME_EVENTO, { detail: null }));
}

/**
 * Postura OPT-OUT, decisão do dono do site: as tags de analytics/publicidade
 * carregam desde a entrada — inclusive quando a pessoa ainda não respondeu
 * (`null`) — e só páram quando ela recusa explicitamente. Por isso
 * `podeRastrear` é `true` tanto para "aceito" quanto para `null`, e `false`
 * apenas para "recusado".
 *
 * Essa postura é exatamente o que a seção "Cookies e rastreamento" da
 * Política de Privacidade precisa descrever com precisão: ela NÃO pode
 * dizer "nada carrega antes do aceite", porque aqui carrega. Qualquer
 * mudança nesta função tem de vir acompanhada da revisão do texto legal.
 */
export function podeRastrear(estado: EstadoConsentimento): boolean {
  return estado !== "recusado";
}
