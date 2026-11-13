import "server-only";

export interface ConfigMeta {
  appId: string;
  appSecret: string;
  loginConfigId: string;
  verifyToken: string;
  cronSecret: string;
}

/**
 * Variáveis do módulo Instagram, lidas no momento da chamada (não no carregamento
 * do módulo). Devolve null se qualquer uma faltar ou estiver vazia: é a trava de
 * 503 das rotas /api/meta/*.
 */
export function configMeta(): ConfigMeta | null {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const loginConfigId = process.env.META_LOGIN_CONFIG_ID;
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  const cronSecret = process.env.CRON_SECRET;
  if (!appId || !appSecret || !loginConfigId || !verifyToken || !cronSecret) return null;
  return { appId, appSecret, loginConfigId, verifyToken, cronSecret };
}
