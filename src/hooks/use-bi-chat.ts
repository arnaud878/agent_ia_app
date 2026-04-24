import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBiStreamPostUrl, buildBiStreamRequestInit } from '@/api/bi-webhook'
import {
  type AppendUiMessageBody,
  apiDeleteConversation,
  apiGetConversationMessages,
  apiListConversations,
  apiPatchConversation,
  apiPostConversation,
  apiPostConversationMessage,
} from '@/api/chat-conversations'
import { useAuth } from '@/auth/AuthContext'
import { getAppEnv, isEnvReady, resolveChatSessionOnly } from '@/config/env'
import { STICK_TO_BOTTOM_PX } from '@/config/constants'
import { useI18n } from '@/i18n'
import {
  appendStreamLog,
  readStoredDisplayKey,
  writeStoredDisplayKey,
} from '@/lib/bi-chat-utils'
import { uiMessagesToChatMessages } from '@/lib/history-messages'
import { readNdjsonEvents } from '@/lib/ndjson-stream'
import { qkConversations } from '@/lib/query-keys'
import { readSessionChatId, writeSessionChatId } from '@/lib/session-chat-id'
import type { ChatMessage } from '@/types/chat'
import type { NdEvent } from '@/types/ndjson'

export function useBiChat() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
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

  const [chatId, setChatId] = useState<string>(() => {
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
  /** Affichage : à 0 dès que le chargement est terminé (évite setState dans l’effet du timer) */
  const displayLiveElapsedMs = loading ? liveElapsedMs : 0
  const [streamLines, setStreamLines] = useState<string[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const streamListRef = useRef<HTMLOListElement>(null)
  const stickToBottomRef = useRef(true)
  const ensuredSessionRef = useRef(false)
  const loadHistorySeqRef = useRef(0)
  const autoHistoryAttemptedForRef = useRef<string | null>(null)
  /** Messages par conversation (session) : évite de refetch à chaque retour sur un fil. */
  const messagesByConvCacheRef = useRef(new Map<string, ChatMessage[]>())

  useEffect(() => {
    messagesByConvCacheRef.current.set(
      chatId,
      messages.map((m) => ({ ...m })),
    )
  }, [chatId, messages])

  const { data: conversationsQueryData, isLoading: conversationsLoading, isError: conversationsError } =
    useQuery({
      queryKey: qkConversations(baseUrl, accessToken),
      queryFn: () => apiListConversations(baseUrl, accessToken!),
      enabled: Boolean(accessToken && baseUrl),
      refetchOnMount: 'always',
    })

  /** Dernière activité en tête (updatedAt, puis createdAt). */
  const conversations = useMemo(() => {
    if (!conversationsQueryData?.length) {
      return conversationsQueryData
    }
    return [...conversationsQueryData].sort((a, b) => {
      const u =
        (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
      if (u !== 0) {
        return u
      }
      return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
    })
  }, [conversationsQueryData])

  const displayKey = useMemo(
    () =>
      conversations?.find((c) => c.id === chatId)?.displayKey
        || readStoredDisplayKey(chatId)
        || '',
    [conversations, chatId],
  )

  const refreshConversationList = useCallback(() => {
    if (accessToken) {
      void queryClient.invalidateQueries({
        queryKey: qkConversations(baseUrl, accessToken),
      })
    }
  }, [queryClient, baseUrl, accessToken])

  const postUi = useCallback(
    (body: AppendUiMessageBody) => {
      if (!accessToken) {
        return
      }
      void apiPostConversationMessage(
        baseUrl,
        accessToken,
        chatId,
        body,
      ).catch(() => {})
    },
    [accessToken, baseUrl, chatId],
  )

  const postConversationAndRefresh = useCallback(
    (id: string) => {
      if (!accessToken) {
        return
      }
      void apiPostConversation(baseUrl, accessToken, { id, title: null })
        .then((row) => {
          writeStoredDisplayKey(row.id, row.displayKey)
          void queryClient.invalidateQueries({
            queryKey: qkConversations(baseUrl, accessToken),
          })
        })
        .catch(() => {})
    },
    [accessToken, baseUrl, queryClient],
  )

  const loadConversationHistory = useCallback(
    async (id: string) => {
      if (!accessToken || !baseUrl) {
        return
      }
      const seq = ++loadHistorySeqRef.current
      setChatId(id)
      writeSessionChatId(id)

      /* Toujours recharger l’API : le cache de session pouvait figer un extrait
       * incomplété si la fil s’est enrichi en base après la première visite. */
      setLiveElapsedMs(0)
      setLoading(true)
      setBanner(null)
      try {
        const rows = await apiGetConversationMessages(
          baseUrl,
          accessToken,
          id,
        )
        if (seq !== loadHistorySeqRef.current) {
          return
        }
        setMessages(uiMessagesToChatMessages(rows))
        setLastRaw(null)
        setStreamLines([])
        stickToBottomRef.current = true
      } catch {
        if (seq === loadHistorySeqRef.current) {
          setBanner(t('chat.conversations.loadError'))
        }
      } finally {
        if (seq === loadHistorySeqRef.current) {
          setLoading(false)
        }
      }
    },
    [
      accessToken,
      baseUrl,
      t,
      setChatId,
      setLoading,
      setBanner,
      setMessages,
      setLastRaw,
      setStreamLines,
      setLiveElapsedMs,
    ],
  )

  useEffect(() => {
    autoHistoryAttemptedForRef.current = null
  }, [chatId])

  useEffect(() => {
    if (!accessToken || !baseUrl || conversationsLoading) {
      return
    }
    if (!conversations?.length || !conversations.some((c) => c.id === chatId)) {
      return
    }
    if (messages.length > 0 || autoHistoryAttemptedForRef.current === chatId) {
      return
    }
    autoHistoryAttemptedForRef.current = chatId
    void loadConversationHistory(chatId)
  }, [
    accessToken,
    baseUrl,
    chatId,
    conversations,
    conversationsLoading,
    loadConversationHistory,
    messages.length,
    setMessages,
  ])

  useEffect(() => {
    if (!accessToken) {
      ensuredSessionRef.current = false
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !baseUrl || ensuredSessionRef.current) {
      return
    }
    ensuredSessionRef.current = true
    postConversationAndRefresh(readSessionChatId() || chatId)
  }, [accessToken, baseUrl, chatId, postConversationAndRefresh])

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
      return
    }
    const t0 = performance.now()
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
    postConversationAndRefresh(id)
  }, [
    postConversationAndRefresh,
    setChatId,
    setMessages,
    setBanner,
    setLastRaw,
    setDraft,
    setStreamLines,
  ])

  const selectConversation = useCallback(
    async (id: string) => {
      if (!accessToken) {
        setChatId(id)
        writeSessionChatId(id)
        setMessages([])
        return
      }
      const fromList = conversations?.find((c) => c.id === id)
      if (fromList?.displayKey) {
        writeStoredDisplayKey(id, fromList.displayKey)
      }
      await loadConversationHistory(id)
    },
    [accessToken, conversations, loadConversationHistory, setChatId, setMessages],
  )

  const deleteConversation = useCallback(
    (id: string) => {
      if (!accessToken) {
        return
      }
      if (!window.confirm(t('chat.conversations.deleteConfirm'))) {
        return
      }
      void (async () => {
        try {
          await apiDeleteConversation(baseUrl, accessToken, id)
          messagesByConvCacheRef.current.delete(id)
          refreshConversationList()
          if (id === chatId) {
            newConversation()
          }
        } catch {
          setBanner(t('common.errorLoad'))
        }
      })()
    },
    [
      accessToken,
      baseUrl,
      chatId,
      newConversation,
      refreshConversationList,
      t,
      setBanner,
    ],
  )

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

    const wasThreadEmpty = messages.length === 0

    setBanner(null)
    stickToBottomRef.current = true
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    }
    setMessages((m) => [...m, userMsg])
    postUi({ role: 'user', text })
    setDraft('')
    setStreamLines([])
    setLiveElapsedMs(0)
    setLoading(true)
    setLastRaw(null)

    const url = getBiStreamPostUrl(baseUrl)
    const t0 = performance.now()
    const env = { baseUrl, userId, apiConfig, accessToken }

    const patchTitleOnFirstTurn = () => {
      if (!accessToken || !wasThreadEmpty || !text) {
        return
      }
      void apiPatchConversation(baseUrl, accessToken, chatId, {
        title: text.slice(0, 100),
      }).then(() => {
        refreshConversationList()
      })
    }

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
        postUi({ role: 'assistant', text: msg, durationMs })
        patchTitleOnFirstTurn()
        return
      }
      if (!res.body) {
        const durationMs = Math.round(performance.now() - t0)
        const em = t('chat.assistant.emptyBody')
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: em,
            durationMs,
          },
        ])
        postUi({ role: 'assistant', text: em, durationMs })
        patchTitleOnFirstTurn()
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
          postUi({ role: 'assistant', text: ev.message, durationMs })
          patchTitleOnFirstTurn()
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
        const noField = t('chat.assistant.noOutputField')
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            html: out || undefined,
            text: !out ? noField : undefined,
            durationMs,
          },
        ])
        if (out) {
          postUi({ role: 'assistant', html: out, durationMs })
        } else {
          postUi({ role: 'assistant', text: noField, durationMs })
        }
      } else {
        const inc = t('chat.assistant.incomplete')
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: inc,
            durationMs,
          },
        ])
        postUi({ role: 'assistant', text: inc, durationMs })
      }
      patchTitleOnFirstTurn()
    } catch (e) {
      const durationMs = Math.round(performance.now() - t0)
      const err = e instanceof Error ? e.message : String(e)
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: err,
          durationMs,
        },
      ])
      postUi({ role: 'assistant', text: err, durationMs })
      patchTitleOnFirstTurn()
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
    messages.length,
    postUi,
    refreshConversationList,
    sessionOnly,
    t,
    userId,
    setBanner,
    setMessages,
    setDraft,
    setStreamLines,
    setLoading,
    setLastRaw,
    setLiveElapsedMs,
  ])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void send()
      }
    },
    [send],
  )

  const showConversationList = Boolean(accessToken)

  return {
    baseUrl,
    userId,
    configOk,
    sessionOnly,
    chatId,
    displayKey,
    messages,
    draft,
    setDraft,
    loading,
    banner,
    lastRaw,
    showRaw,
    setShowRaw,
    liveElapsedMs: displayLiveElapsedMs,
    streamLines,
    threadRef,
    bottomRef,
    streamListRef,
    newConversation,
    send,
    onThreadScroll,
    onKeyDown,
    showConversationList,
    conversations,
    conversationsLoading,
    conversationsError,
    selectConversation,
    deleteConversation,
  }
}
