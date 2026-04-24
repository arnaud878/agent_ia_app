export type AppEnv = {
  baseUrl: string
  userId: string
  apiConfig: string
}

/**
 * Entrée unique pour les variables Vite (évite l’import direct répétitif de `import.meta.env`).
 */
export function getAppEnv(): AppEnv {
  return {
    baseUrl: (import.meta.env.VITE_API_BASE?.trim() || 'http://localhost:3000').replace(
      /\/$/,
      '',
    ),
    userId: import.meta.env.VITE_USER_ID?.trim() || '',
    apiConfig: import.meta.env.VITE_X_API_CONFIG?.trim() || '',
  }
}

/**
 * Force côté front l’accès chat uniquement en session (sans relire l’API).
 * Sinon on suit `webhookJwtOnly` renvoyé par GET /auth/config.
 */
export function chatSessionOnlyFromVite(): boolean | null {
  const v = import.meta.env.VITE_BI_CHAT_SESSION_ONLY
  if (v === 'true') {
    return true
  }
  if (v === 'false') {
    return false
  }
  return null
}

/** Avant le chargement de /auth/config, seul le override Vite s’applique. */
export function resolveChatSessionOnly(
  webhookJwtOnlyFromServer: boolean | undefined,
  configLoaded: boolean,
): boolean {
  const v = chatSessionOnlyFromVite()
  if (v === true) {
    return true
  }
  if (v === false) {
    return false
  }
  return configLoaded && webhookJwtOnlyFromServer === true
}

/**
 * Si `sessionOnly` : uniquement JWT + userId (pas de clé .env n8n).
 * Sinon : JWT ou (VITE_X_API_CONFIG + VITE_USER_ID).
 */
export function isEnvReady(
  env: AppEnv,
  auth: { accessToken: string | null; userId: string | null },
  options?: { sessionOnly?: boolean },
): boolean {
  if (options?.sessionOnly) {
    return Boolean(auth.accessToken && auth.userId)
  }
  if (auth.accessToken && auth.userId) {
    return true
  }
  return Boolean(env.apiConfig && env.userId)
}
