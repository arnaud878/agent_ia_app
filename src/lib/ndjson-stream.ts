import type { NdEvent } from '@/types/ndjson'

/**
 * Parse le corps d’une réponse NDJSON (une ligne JSON = un événement côté agent BI).
 * S’arrête après le premier `done` ou `error` (casse la lecture, comme l’intégration n8n d’origine).
 */
export async function* readNdjsonEvents(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<NdEvent> {
  if (!body) {
    return
  }
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += dec.decode(value, { stream: true })
      for (;;) {
        const nl = buffer.indexOf('\n')
        if (nl < 0) {
          break
        }
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        const trimmed = line.trim()
        if (!trimmed) {
          continue
        }
        let ev: NdEvent
        try {
          ev = JSON.parse(trimmed) as NdEvent
        } catch {
          continue
        }
        yield ev
        if (ev.t === 'done' || ev.t === 'error') {
          return
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
