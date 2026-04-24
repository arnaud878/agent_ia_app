import { apiUrl, getBiWebhookStreamPath } from '@/config/api-routes'
import { N8N_WEBHOOK_PATH_SEGMENT, WEBHOOK_STREAM_SUFFIX } from '@/config/constants'
import type { AppEnv } from '@/config/env'

/**
 * URL POST NDJSON (streaming), alignée sur le contrôleur Nest `webhook` + path n8n.
 */
export function getBiStreamPostUrl(baseUrl: string): string {
  return apiUrl(
    baseUrl,
    getBiWebhookStreamPath(N8N_WEBHOOK_PATH_SEGMENT, WEBHOOK_STREAM_SUFFIX),
  )
}

export type BiResponseMode = 'quick' | 'pro'

export type BiChatRequestBody = {
  message: string
  chatId: string
  userId: string
  /** Rapide : pas de graphique ; Pro : réponse complète avec Chart.js (défaut côté serveur si absent). */
  responseMode?: BiResponseMode
}

/** Si `accessToken` est défini, en-tête Bearer (rôle + tables). Sinon `x-api-config` (intégration n8n). */
export function buildBiStreamRequestInit(
  body: BiChatRequestBody,
  env: AppEnv & { accessToken: string | null },
): RequestInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/x-ndjson, application/json',
  }
  if (env.accessToken) {
    headers['Authorization'] = `Bearer ${env.accessToken}`
  } else {
    headers['x-api-config'] = env.apiConfig
  }
  return {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }
}
