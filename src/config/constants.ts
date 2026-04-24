/**
 * Même segment que `N8N_WEBHOOK_PATH_SEGMENT` côté ia_back
 * (variable `VITE_N8N_WEBHOOK_PATH_SEGMENT` dans .env, défaut n8n historique).
 */
const DEFAULT_N8N_PATH = '5a2715bd-0b56-4e05-9c24-eb48e13c5d7a'

export const N8N_WEBHOOK_PATH_SEGMENT =
  import.meta.env.VITE_N8N_WEBHOOK_PATH_SEGMENT?.trim() || DEFAULT_N8N_PATH

export const WEBHOOK_STREAM_SUFFIX = 'stream' as const

export const SESSION_CHAT_ID_KEY = 'ia_front_chat_id' as const

/** Mode de réponse BI (`quick` | `pro`), persistant par onglet. */
export const BI_RESPONSE_MODE_KEY = 'ia_bi_response_mode' as const

/** Limite d’affichage du journal d’étapes (streaming). */
export const STREAM_LOG_MAX = 80
export const STREAM_LOG_KEEP = 60

export const STICK_TO_BOTTOM_PX = 120
