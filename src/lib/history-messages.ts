import type { ChatMessage } from '@/types/chat'
import type { UiMessageRow } from '@/api/chat-conversations'

/** Messages persistés côté UI (table dédiée, hors n8n agent). */
export function uiMessagesToChatMessages(rows: UiMessageRow[]): ChatMessage[] {
  return rows.map((m) => {
    const text = m.text?.trim() ? m.text : undefined
    const html = m.html?.trim() ? m.html : undefined
    if (m.role === 'user') {
      return {
        id: m.id,
        role: 'user' as const,
        text,
        durationMs: m.durationMs ?? undefined,
      }
    }
    return {
      id: m.id,
      role: 'assistant' as const,
      // Affichage: le HTML prime ; le texte sert de repli s’il n’y a pas de HTML
      text: html ? undefined : text,
      html,
      durationMs: m.durationMs ?? undefined,
    }
  })
}
