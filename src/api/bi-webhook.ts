import {
  N8N_WEBHOOK_PATH_SEGMENT,
  WEBHOOK_STREAM_SUFFIX,
} from '@/config/constants'
import type { AppEnv } from '@/config/env'

/**
 * URL POST NDJSON (streaming), alignée sur le contrôleur Nest `webhook` + path n8n.
 */
export function getBiStreamPostUrl(baseUrl: string): string {
  return `${baseUrl}/webhook/${N8N_WEBHOOK_PATH_SEGMENT}/${WEBHOOK_STREAM_SUFFIX}`
}

export type BiChatRequestBody = {
  message: string
  chatId: string
  userId: string
}

export function buildBiStreamRequestInit(
  body: BiChatRequestBody,
  env: AppEnv,
): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson, application/json',
      'x-api-config': env.apiConfig,
    },
    body: JSON.stringify(body),
  }
}
