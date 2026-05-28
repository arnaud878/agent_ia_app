import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type SetStateAction,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getBiStreamPostUrl,
  buildBiStreamRequestInit,
  type BiResponseMode,
} from '@/api/bi-webhook'
import {
  type AppendUiMessageBody,
  type ConversationAttachmentRow,
  apiDeleteConversationAttachment,
  apiDeleteConversation,
  apiGetConversationMessages,
  apiListConversationAttachments,
  apiListConversations,
  apiPatchConversation,
  apiPostConversation,
  apiPostConversationMessage,
  apiUploadConversationAttachment,
} from '@/api/chat-conversations'
import { useAuth } from '@/auth/AuthContext'
import { getAppEnv, isEnvReady, resolveChatSessionOnly } from '@/config/env'
import { BI_RESPONSE_MODE_KEY, STICK_TO_BOTTOM_PX } from '@/config/constants'
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

function readStoredResponseMode(): BiResponseMode {
  try {
    const s = sessionStorage.getItem(BI_RESPONSE_MODE_KEY)
    if (s === 'quick' || s === 'pro') {
      return s
    }
  } catch {
    /* ignore */
  }
  return 'pro'
}

export type ConversationUiState = {
  messages: ChatMessage[]
  draft: string
  /** Chargement historique ou réponse IA en cours */
  loading: boolean
  /** Horodatage (performance.now) du début de la requête IA — conserve le temps si on change de fil */
  streamStartedAt: number | null
  streamLines: string[]
  lastRaw: unknown | null
  liveElapsedMs: number
  attachments: ConversationAttachmentRow[]
  selectedAttachmentIds: string[]
}

function defaultConversationUiState(): ConversationUiState {
  return {
    messages: [],
    draft: '',
    loading: false,
    streamStartedAt: null,
    streamLines: [],
    lastRaw: null,
    liveElapsedMs: 0,
    attachments: [],
    selectedAttachmentIds: [],
  }
}

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
  /** État UI par conversation : les requêtes en cours continuent même si on change de fil. */
  const [convStates, setConvStates] = useState<
    Record<string, ConversationUiState>
  >({})
  const [banner, setBanner] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [responseMode, setResponseMode] = useState<BiResponseMode>(
    readStoredResponseMode,
  )
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const streamListRef = useRef<HTMLOListElement>(null)
  const stickToBottomRef = useRef(true)
  const ensuredSessionRef = useRef(false)
  const loadHistorySeqRef = useRef(0)
  const autoHistoryAttemptedForRef = useRef<string | null>(null)
  const messagesByConvCacheRef = useRef(new Map<string, ChatMessage[]>())
  /** Horodatage de requête IA par fil (ref : survit aux mises à jour React intermédiaires). */
  const streamStartedRef = useRef(new Map<string, number>())
  const convStatesRef = useRef(convStates)
  useEffect(() => {
    convStatesRef.current = convStates
  }, [convStates])

  const patchConv = useCallback(
    (
      convId: string,
      patch:
        | Partial<ConversationUiState>
        | ((prev: ConversationUiState) => Partial<ConversationUiState>),
    ) => {
      setConvStates((prev) => {
        const cur = prev[convId] ?? defaultConversationUiState()
        const delta = typeof patch === 'function' ? patch(cur) : patch
        return { ...prev, [convId]: { ...cur, ...delta } }
      })
    },
    [],
  )

  const patchConvMessages = useCallback(
    (convId: string, fn: (m: ChatMessage[]) => ChatMessage[]) => {
      setConvStates((prev) => {
        const cur = prev[convId] ?? defaultConversationUiState()
        return {
          ...prev,
          [convId]: { ...cur, messages: fn(cur.messages) },
        }
      })
    },
    [],
  )

  const activeState = useMemo(
    () => convStates[chatId] ?? defaultConversationUiState(),
    [convStates, chatId],
  )

  const messages = activeState.messages
  const draft = activeState.draft
  const loading = activeState.loading
  const streaming =
    streamStartedRef.current.has(chatId) ||
    activeState.streamStartedAt != null
  const lastRaw = activeState.lastRaw
  const streamLines = activeState.streamLines
  const attachments = activeState.attachments
  const selectedAttachmentIds = activeState.selectedAttachmentIds

  const [streamTick, setStreamTick] = useState(0)

  const hasStreaming = useMemo(() => {
    if (streamStartedRef.current.size > 0) {
      return true
    }
    return Object.values(convStates).some((s) => s.streamStartedAt != null)
  }, [convStates, streamTick])
  useEffect(() => {
    if (!hasStreaming) {
      return
    }
    const id = window.setInterval(() => {
      setStreamTick((n) => n + 1)
    }, 100)
    return () => {
      clearInterval(id)
    }
  }, [hasStreaming])

  const displayLiveElapsedMs = useMemo(() => {
    const started =
      streamStartedRef.current.get(chatId) ?? activeState.streamStartedAt
    if (started == null) {
      return 0
    }
    return Math.max(0, Math.round(performance.now() - started))
  }, [chatId, activeState.streamStartedAt, streamTick])

  const loadingConversationIds = useMemo(() => {
    const ids = new Set(streamStartedRef.current.keys())
    for (const [id, s] of Object.entries(convStates)) {
      if (s.streamStartedAt != null) {
        ids.add(id)
      }
    }
    return ids
  }, [convStates, streamTick])

  useEffect(() => {
    for (const [id, state] of Object.entries(convStates)) {
      messagesByConvCacheRef.current.set(
        id,
        state.messages.map((m) => ({ ...m })),
      )
    }
  }, [convStates])

  const { data: conversationsQueryData, isLoading: conversationsLoading, isError: conversationsError } =
    useQuery({
      queryKey: qkConversations(baseUrl, accessToken),
      queryFn: () => apiListConversations(baseUrl, accessToken!),
      enabled: Boolean(accessToken && baseUrl),
      refetchOnMount: 'always',
    })

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
    (convId: string, body: AppendUiMessageBody) => {
      if (!accessToken) {
        return
      }
      void apiPostConversationMessage(
        baseUrl,
        accessToken,
        convId,
        body,
      ).catch(() => {})
    },
    [accessToken, baseUrl],
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
      setChatId(id)
      writeSessionChatId(id)
      if (convStatesRef.current[id]?.streamStartedAt != null) {
        return
      }
      const seq = ++loadHistorySeqRef.current

      patchConv(id, {
        loading: true,
        streamLines: [],
        lastRaw: null,
      })
      setBanner(null)
      try {
        const [rows, atts] = await Promise.all([
          apiGetConversationMessages(baseUrl, accessToken, id),
          apiListConversationAttachments(baseUrl, accessToken, id),
        ])
        if (seq !== loadHistorySeqRef.current) {
          return
        }
        const uiMessages = uiMessagesToChatMessages(rows)
        patchConv(id, (cur) => ({
          messages: uiMessages,
          attachments: atts,
          selectedAttachmentIds: cur.selectedAttachmentIds.filter((x) =>
            atts.some((a) => a.id === x),
          ),
          lastRaw: null,
          streamLines: [],
        }))
        stickToBottomRef.current = true
      } catch {
        if (seq === loadHistorySeqRef.current) {
          setBanner(t('chat.conversations.loadError'))
        }
      } finally {
        if (seq === loadHistorySeqRef.current) {
          patchConv(id, { loading: false })
        }
      }
    },
    [accessToken, baseUrl, t, patchConv],
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
    const activeMessages = convStates[chatId]?.messages ?? []
    if (activeMessages.length > 0 || autoHistoryAttemptedForRef.current === chatId) {
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
    convStates,
    loadConversationHistory,
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
    try {
      sessionStorage.setItem(BI_RESPONSE_MODE_KEY, responseMode)
    } catch {
      /* ignore */
    }
  }, [responseMode])

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, streamLines])

  useEffect(() => {
    const el = streamListRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [streamLines])

  const setDraft = useCallback(
    (value: SetStateAction<string>) => {
      patchConv(chatId, (cur) => ({
        draft: typeof value === 'function' ? value(cur.draft) : value,
      }))
    },
    [chatId, patchConv],
  )

  const newConversation = useCallback(() => {
    const id = crypto.randomUUID()
    setChatId(id)
    writeSessionChatId(id)
    stickToBottomRef.current = true
    setBanner(null)
    postConversationAndRefresh(id)
  }, [postConversationAndRefresh])

  const selectConversation = useCallback(
    async (id: string) => {
      if (!accessToken) {
        setChatId(id)
        writeSessionChatId(id)
        return
      }
      const fromList = conversations?.find((c) => c.id === id)
      if (fromList?.displayKey) {
        writeStoredDisplayKey(id, fromList.displayKey)
      }
      await loadConversationHistory(id)
    },
    [accessToken, conversations, loadConversationHistory],
  )

  const measureStreamDuration = useCallback((convId: string, fallbackStart: number) => {
    const started = streamStartedRef.current.get(convId) ?? fallbackStart
    return Math.max(0, Math.round(performance.now() - started))
  }, [])

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
          setConvStates((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
          })
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
    ],
  )

  const send = useCallback(async () => {
    const convId = chatId
    const conv = convStates[convId] ?? defaultConversationUiState()
    const text = conv.draft.trim()
    if (!text || conv.streamStartedAt != null) {
      return
    }
    if (!configOk) {
      setBanner(
        t(sessionOnly ? 'chat.error.session' : 'chat.error.config'),
      )
      return
    }

    const wasThreadEmpty = conv.messages.length === 0

    setBanner(null)
    stickToBottomRef.current = true
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    }
    patchConvMessages(convId, (m) => [...m, userMsg])
    postUi(convId, { role: 'user', text })
    const t0 = performance.now()
    streamStartedRef.current.set(convId, t0)
    setStreamTick((n) => n + 1)
    patchConv(convId, {
      draft: '',
      streamLines: [],
      liveElapsedMs: 0,
      loading: true,
      streamStartedAt: t0,
      lastRaw: null,
    })

    const url = getBiStreamPostUrl(baseUrl)
    const env = { baseUrl, userId, apiConfig, accessToken }

    const patchTitleOnFirstTurn = () => {
      if (!accessToken || !wasThreadEmpty || !text) {
        return
      }
      void apiPatchConversation(baseUrl, accessToken, convId, {
        title: text.slice(0, 100),
      }).then(() => {
        refreshConversationList()
      })
    }

    try {
      const res = await fetch(
        url,
        buildBiStreamRequestInit(
          {
            message: text,
            chatId: convId,
            userId,
            responseMode,
            attachmentIds: conv.selectedAttachmentIds,
          },
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
        const durationMs = measureStreamDuration(convId, t0)
        patchConvMessages(convId, (m) => [
          ...m,
          { id: crypto.randomUUID(), role: 'assistant', text: msg, durationMs },
        ])
        postUi(convId, { role: 'assistant', text: msg, durationMs })
        patchTitleOnFirstTurn()
        return
      }
      if (!res.body) {
        const durationMs = measureStreamDuration(convId, t0)
        const em = t('chat.assistant.emptyBody')
        patchConvMessages(convId, (m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: em,
            durationMs,
          },
        ])
        postUi(convId, { role: 'assistant', text: em, durationMs })
        patchTitleOnFirstTurn()
        return
      }

      let doneEvent: (NdEvent & { t: 'done' }) | null = null
      for await (const ev of readNdjsonEvents(res.body)) {
        if (ev.t === 'status') {
          setConvStates((prev) => {
            const cur = prev[convId]
            if (!cur) {
              return prev
            }
            return {
              ...prev,
              [convId]: {
                ...cur,
                streamLines: appendStreamLog(cur.streamLines, ev.m),
              },
            }
          })
        } else if (ev.t === 'error') {
          const durationMs = measureStreamDuration(convId, t0)
          patchConv(convId, { lastRaw: { error: ev.message, stream: true } })
          patchConvMessages(convId, (m) => [
            ...m,
            { id: crypto.randomUUID(), role: 'assistant', text: ev.message, durationMs },
          ])
          postUi(convId, { role: 'assistant', text: ev.message, durationMs })
          patchTitleOnFirstTurn()
          return
        } else if (ev.t === 'done') {
          doneEvent = ev
          patchConv(convId, { lastRaw: ev })
        }
      }

      const durationMs = measureStreamDuration(convId, t0)
      if (doneEvent) {
        const out =
          typeof doneEvent.output === 'string' ? doneEvent.output : null
        const requeteSQL =
          typeof doneEvent.requeteSQL === 'string'
            ? doneEvent.requeteSQL
            : null
        const resultatSQL =
          typeof doneEvent.resultatSQL === 'string'
            ? doneEvent.resultatSQL
            : null
        const noField = t('chat.assistant.noOutputField')
        patchConvMessages(convId, (m) => [
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
          postUi(convId, { role: 'assistant', html: out, durationMs, requeteSQL, resultatSQL })
        } else {
          postUi(convId, { role: 'assistant', text: noField, durationMs, requeteSQL, resultatSQL })
        }
      } else {
        const inc = t('chat.assistant.incomplete')
        patchConvMessages(convId, (m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: inc,
            durationMs,
          },
        ])
        postUi(convId, { role: 'assistant', text: inc, durationMs })
      }
      patchTitleOnFirstTurn()
    } catch (e) {
      const durationMs = measureStreamDuration(convId, t0)
      const err = e instanceof Error ? e.message : String(e)
      patchConvMessages(convId, (m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: err,
          durationMs,
        },
      ])
      postUi(convId, { role: 'assistant', text: err, durationMs })
      patchTitleOnFirstTurn()
    } finally {
      streamStartedRef.current.delete(convId)
      setStreamTick((n) => n + 1)
      patchConv(convId, {
        loading: false,
        streamStartedAt: null,
        liveElapsedMs: 0,
      })
      /* Laisser React afficher une frame avec le journal (ex. phase 2 HTML) avant de le vider. */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          patchConv(convId, { streamLines: [] })
        })
      })
    }
  }, [
    apiConfig,
    accessToken,
    baseUrl,
    chatId,
    configOk,
    convStates,
    measureStreamDuration,
    patchConv,
    patchConvMessages,
    postUi,
    refreshConversationList,
    responseMode,
    sessionOnly,
    t,
    userId,
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

  const uploadAttachment = useCallback(
    async (file: File) => {
      if (!accessToken || !baseUrl) {
        return
      }
      setUploadingAttachment(true)
      setBanner(null)
      try {
        const row = await apiUploadConversationAttachment(baseUrl, accessToken, chatId, file)
        patchConv(chatId, (cur) => ({
          attachments: [row, ...cur.attachments],
          selectedAttachmentIds: cur.selectedAttachmentIds.includes(row.id)
            ? cur.selectedAttachmentIds
            : [...cur.selectedAttachmentIds, row.id],
        }))
      } catch (e) {
        setBanner(e instanceof Error ? e.message : t('common.error'))
      } finally {
        setUploadingAttachment(false)
      }
    },
    [accessToken, baseUrl, chatId, patchConv, t],
  )

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      if (!accessToken || !baseUrl) {
        return
      }
      try {
        await apiDeleteConversationAttachment(baseUrl, accessToken, chatId, attachmentId)
        patchConv(chatId, (cur) => ({
          attachments: cur.attachments.filter((a) => a.id !== attachmentId),
          selectedAttachmentIds: cur.selectedAttachmentIds.filter(
            (x) => x !== attachmentId,
          ),
        }))
      } catch (e) {
        setBanner(e instanceof Error ? e.message : t('common.error'))
      }
    },
    [accessToken, baseUrl, chatId, patchConv, t],
  )

  const toggleAttachmentSelection = useCallback(
    (attachmentId: string) => {
      patchConv(chatId, (cur) => ({
        selectedAttachmentIds: cur.selectedAttachmentIds.includes(attachmentId)
          ? cur.selectedAttachmentIds.filter((x) => x !== attachmentId)
          : [...cur.selectedAttachmentIds, attachmentId],
      }))
    },
    [chatId, patchConv],
  )

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
    streaming,
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
    loadingConversationIds,
    responseMode,
    setResponseMode,
    attachments,
    selectedAttachmentIds,
    uploadingAttachment,
    uploadAttachment,
    deleteAttachment,
    toggleAttachmentSelection,
  }
}
