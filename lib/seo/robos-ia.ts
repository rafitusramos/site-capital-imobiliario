// User-agents de robôs de IA, agrupados por função. Decisão do dono
// (2026-11-10): todos liberados, inclusive os de treino. Usado por
// app/robots.ts e travado em tests/unidade/robots.test.ts.

/** Busca: indexam o site para responder em buscadores de IA (ChatGPT Search, Perplexity, Claude). */
export const ROBOS_IA_BUSCA = ["OAI-SearchBot", "PerplexityBot", "Claude-SearchBot"] as const;

/** Leitura sob demanda: abrem a página quando uma pessoa pede ao assistente para lê-la. */
export const ROBOS_IA_LEITURA_USUARIO = ["ChatGPT-User", "Perplexity-User", "Claude-User"] as const;

/** Treino: coletam conteúdo para treinar modelos. Hoje liberados por decisão do dono. */
export const ROBOS_IA_TREINO = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
] as const;

export const ROBOS_IA: string[] = [
  ...ROBOS_IA_BUSCA,
  ...ROBOS_IA_LEITURA_USUARIO,
  ...ROBOS_IA_TREINO,
];
