import type {
  Dispatch,
  KeyboardEvent,
  RefObject,
  SetStateAction,
} from 'react'
import { AssistantHtmlFrame } from '@/components/assistant/AssistantHtmlFrame'
import { t } from '@/i18n'
import { formatDurationMs } from '@/lib/format-duration'
import type { ChatMessage } from '@/types/chat'

export type ChatViewProps = {
  baseUrl: string
  userId: string
  configOk: boolean
  /** Si true, pas d’accès par clé .env (config serveur VITE/WEBHOOK_JWT_ONLY) */
  sessionOnly: boolean
  chatId: string
  messages: ChatMessage[]
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
  loading: boolean
  banner: string | null
  lastRaw: unknown
  showRaw: boolean
  setShowRaw: Dispatch<SetStateAction<boolean>>
  liveElapsedMs: number
  streamLines: string[]
  threadRef: RefObject<HTMLDivElement | null>
  bottomRef: RefObject<HTMLDivElement | null>
  streamListRef: RefObject<HTMLOListElement | null>
  newConversation: () => void
  send: () => void | Promise<void>
  onThreadScroll: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

export function ChatView(props: ChatViewProps) {
  const {
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
  } = props

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div className="chat-brand">
          <h1>{t('chat.title')}</h1>
          <span className="chat-sub">{t('chat.backend')}</span>
        </div>
        <div className="chat-actions">
          <span className="chat-meta" title={t('chat.sessionTitle')}>
            {t('chat.sessionPrefix')} · {chatId.slice(0, 8)}…
          </span>
          <button type="button" className="btn ghost" onClick={newConversation}>
            {t('chat.newConversation')}
          </button>
        </div>
      </header>

      {!configOk && (
        <div className="config-banner" role="status">
          {sessionOnly
            ? t('chat.banner.session')
            : t('chat.banner.config')}
        </div>
      )}

      {banner && (
        <div className="config-banner error" role="alert">
          {banner}
        </div>
      )}

      <main className="chat-main">
        <div
          className="chat-thread"
          ref={threadRef}
          onScroll={onThreadScroll}
          aria-live="polite"
        >
          {messages.length === 0 && !loading && (
            <p className="chat-empty">
              {t('chat.empty.hint')}{' '}
              <kbd>{t('chat.empty.kbd')}</kbd> {t('chat.empty.shift')}
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}
            >
              {msg.role === 'user' && (
                <div className="bubble-label">{t('chat.role.user')}</div>
              )}
              {msg.role === 'assistant' && (
                <div className="bubble-label">{t('chat.role.assistant')}</div>
              )}
              {msg.text && <div className="bubble-text">{msg.text}</div>}
              {msg.html && <AssistantHtmlFrame html={msg.html} />}
              {msg.durationMs != null && (
                <div
                  className="bubble-timing"
                  title={t('chat.timingTitle')}
                >
                  {formatDurationMs(msg.durationMs)}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble assistant typing stream-bubble">
              <div className="bubble-label">{t('chat.role.assistant')}</div>
              {streamLines.length > 0 && (
                <>
                  <p className="stream-log-hint">{t('chat.streamHint')}</p>
                  <ol
                    className="stream-log"
                    ref={streamListRef}
                    aria-label={t('chat.streamLogLabel')}
                  >
                    {streamLines.map((line, i) => (
                      <li key={`${i}-${line.slice(0, 32)}`}>{line}</li>
                    ))}
                  </ol>
                </>
              )}
              <div className="typing-dots" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <div className="bubble-timing live" aria-live="polite">
                {formatDurationMs(liveElapsedMs)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="chat-composer">
        <textarea
          className="chat-input"
          rows={2}
          placeholder={
            configOk
              ? t('chat.placeholderReady')
              : t('chat.placeholderNoConfig')
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!configOk || loading}
        />
        <button
          type="button"
          className="btn send"
          onClick={() => void send()}
          disabled={!configOk || loading || !draft.trim()}
        >
          {loading ? t('chat.sending') : t('chat.send')}
        </button>
      </footer>

      <div className="chat-footer-tech">
        <code>{baseUrl}</code>
        {userId && (
          <span>
            · {t('chat.tech.user')} <code>{userId}</code>
          </span>
        )}
        {lastRaw !== null && (
          <button
            type="button"
            className="linkish"
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? t('chat.rawToggleHide') : t('chat.rawToggleShow')}
          </button>
        )}
      </div>
      {showRaw && lastRaw !== null && (
        <pre className="raw-json">{JSON.stringify(lastRaw, null, 2)}</pre>
      )}
    </div>
  )
}
