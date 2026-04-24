import type { NdEvent } from './ndjson'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  /** Texte utilisateur ou message d’erreur */
  text?: string
  /** Réponse HTML du modèle (assistant) */
  html?: string
  /** Durée côté client (requête → réponse complète), ms */
  durationMs?: number
}

export type { NdEvent }
