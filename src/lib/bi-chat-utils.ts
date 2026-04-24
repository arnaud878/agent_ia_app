import { STREAM_LOG_KEEP, STREAM_LOG_MAX } from '@/config/constants'

const DISPLAY_KEY_PREFIX = 'ia_chat_dk_'

export function readStoredDisplayKey(cid: string): string {
  if (!cid) {
    return ''
  }
  try {
    return sessionStorage.getItem(`${DISPLAY_KEY_PREFIX}${cid}`) || ''
  } catch {
    return ''
  }
}

export function writeStoredDisplayKey(cid: string, key: string) {
  if (!cid || !key) {
    return
  }
  try {
    sessionStorage.setItem(`${DISPLAY_KEY_PREFIX}${cid}`, key)
  } catch {
    /* ignore */
  }
}

export function appendStreamLog(prev: string[], line: string): string[] {
  return prev.length >= STREAM_LOG_MAX
    ? [...prev.slice(-STREAM_LOG_KEEP), line]
    : [...prev, line]
}
