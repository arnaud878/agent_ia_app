import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useAuth } from '@/auth/AuthContext'
import { getBiStreamPostUrl, buildBiStreamRequestInit } from '@/api/bi-webhook'
import { getAppEnv, isEnvReady, resolveChatSessionOnly } from '@/config/env'
import { t } from '@/i18n'
import {
  STICK_TO_BOTTOM_PX,
  STREAM_LOG_KEEP,
  STREAM_LOG_MAX,
} from '@/config/constants'
import { readNdjsonEvents } from '@/lib/ndjson-stream'
import { readSessionChatId, writeSessionChatId } from '@/lib/session-chat-id'
import type { ChatMessage } from '@/types/chat'
import type { NdEvent } from '@/types/ndjson'

function appendStreamLog(prev: string[], line: string): string[] {
  return prev.length >= STREAM_LOG_MAX
    ? [...prev.slice(-STREAM_LOG_KEEP), line]
    : [...prev, line]
}

export function useBiChat() {
  const { token: accessToken, user: authUser, authConfig, configLoaded } =
    useAuth()
  const { baseUrl, userId: envUserId, apiConfig } = getAppEnv()
  const userId = authUser?.id || envUserId
  const sessionOnly = resolveChatSessionOnly(
    authConfig?.webhookJwtOnly,
    configLoaded,
  )
  const configOk = isEnvReady(
    { baseUrl, userId: envUserId, apiConfig },
    { accessToken, userId: authUser?.id || null },
    { sessionOnly },
  )

  const [chatId, setChatId] = useState(() => {
    const fromSession = readSessionChatId()
    return fromSession || crypto.randomUUID()
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [lastRaw, setLastRaw] = useState<unknown>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [liveElapsedMs, setLiveElapsedMs] = useState(0)
  const [streamLines, setStreamLines] = useState<string[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const streamListRef = useRef<HTMLOListElement>(null)
  const stickToBottomRef = useRef(true)

  const onThreadScroll = useCallback(() => {
    const el = threadRef.current
    if (!el) {
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    const fromBottom = scrollHeight - scrollTop - clientHeight
    stickToBottomRef.current = fromBottom < STICK_TO_BOTTOM_PX
  }, [])

  useEffect(() => {
    writeSessionChatId(chatId)
  }, [chatId])

  useEffect(() => {
    if (!loading) {
      setLiveElapsedMs(0)
      return
    }
    const t0 = performance.now()
    setLiveElapsedMs(0)
    const id = window.setInterval(() => {
      setLiveElapsedMs(Math.round(performance.now() - t0))
    }, 100)
    return () => {
      clearInterval(id)
    }
  }, [loading])

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, streamLines])

  useEffect(() => {
    const el = streamListRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [streamLines])

  const newConversation = useCallback(() => {
    const id = crypto.randomUUID()
    setChatId(id)
    writeSessionChatId(id)
    setMessages([])
    setBanner(null)
    setLastRaw(null)
    setDraft('')
    setStreamLines([])
    stickToBottomRef.current = true
  }, [])

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!text || loading) {
      return
    }
    if (!configOk) {
      setBanner(
        t(sessionOnly ? 'chat.error.session' : 'chat.error.config'),
      )
      return
    }

    setBanner(null)
    stickToBottomRef.current = true
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    }
    setMessages((m) => [...m, userMsg])
    setDraft('')
    setStreamLines([])
    setLoading(true)
    setLastRaw(null)

    const url = getBiStreamPostUrl(baseUrl)
    const t0 = performance.now()
    const env = { baseUrl, userId, apiConfig, accessToken }

    try {
      const res = await fetch(
        url,
        buildBiStreamRequestInit(
          { message: text, chatId, userId },
          env,
        ),
      )
      if (!res.ok) {
        const errText = await res.text()
        let msg = `HTTP ${res.status}`
        try {
          const j = errText ? (JSON.parse(errText) as { message?: string }) : null
          if (j?.message) {
            msg = j.message
          }
        } catch {
          if (errText) {
            msg = errText.slice(0, 500)
          }
        }
        const durationMs = Math.round(performance.now() - t0)
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'assistant', text: msg, durationMs },
        ])
        return
      }
      if (!res.body) {
        const durationMs = Math.round(performance.now() - t0)
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'Réponse sans corps (stream).',
            durationMs,
          },
        ])
        return
      }

      let doneEvent: (NdEvent & { t: 'done' }) | null = null
      for await (const ev of readNdjsonEvents(res.body)) {
        if (ev.t === 'status') {
          setStreamLines((prev) => appendStreamLog(prev, ev.m))
        } else if (ev.t === 'error') {
          const durationMs = Math.round(performance.now() - t0)
          setLastRaw({ error: ev.message, stream: true })
          setMessages((m) => [
            ...m,
            { id: crypto.randomUUID(), role: 'assistant', text: ev.message, durationMs },
          ])
          return
        } else if (ev.t === 'done') {
          doneEvent = ev
          setLastRaw(ev)
        }
      }

      const durationMs = Math.round(performance.now() - t0)
      if (doneEvent) {
        const out =
          typeof doneEvent.output === 'string' ? doneEvent.output : null
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            html: out || undefined,
            text: !out ? 'Réponse sans champ output.' : undefined,
            durationMs,
          },
        ])
      } else {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'Le flux s’est arrêté sans réponse complète.',
            durationMs,
          },
        ])
      }
    } catch (e) {
      const durationMs = Math.round(performance.now() - t0)
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: e instanceof Error ? e.message : String(e),
          durationMs,
        },
      ])
    } finally {
      setStreamLines([])
      setLoading(false)
    }
  }, [
    apiConfig,
    accessToken,
    baseUrl,
    chatId,
    configOk,
    draft,
    loading,
    sessionOnly,
    userId,
  ])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return {
    baseUrl,
    userId,
    configOk,
    sessionOnly,
    chatId,
    messages,
    draft,
    setDraft,
    loading,
    banner,
    lastRaw,
    showRaw,
    setShowRaw,
    liveElapsedMs,
    streamLines,
    threadRef,
    bottomRef,
    streamListRef,
    newConversation,
    send,
    onThreadScroll,
    onKeyDown,
  }
}
