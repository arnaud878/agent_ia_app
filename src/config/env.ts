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

export function isEnvReady(env: AppEnv): boolean {
  return Boolean(env.apiConfig && env.userId)
}
