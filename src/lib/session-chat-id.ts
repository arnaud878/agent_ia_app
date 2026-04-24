import { SESSION_CHAT_ID_KEY } from '@/config/constants'

export function readSessionChatId(): string {
  try {
    return sessionStorage.getItem(SESSION_CHAT_ID_KEY) || ''
  } catch {
    return ''
  }
}

export function writeSessionChatId(id: string): void {
  try {
    sessionStorage.setItem(SESSION_CHAT_ID_KEY, id)
  } catch {
    /* ignore */
  }
}
