/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de ia_back, ex. http://localhost:3000 */
  readonly VITE_API_BASE?: string
  /** Même secret que API_CONFIG_SECRET (en-tête x-api-config) */
  readonly VITE_X_API_CONFIG?: string
  /** Identifiant utilisateur envoyé au webhook */
  readonly VITE_USER_ID?: string
  /** Même segment que N8N_WEBHOOK_PATH_SEGMENT (ia_back) — path après /webhook/ */
  readonly VITE_N8N_WEBHOOK_PATH_SEGMENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
