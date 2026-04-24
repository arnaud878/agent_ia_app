import type {
  Dispatch,
  KeyboardEvent,
  RefObject,
  SetStateAction,
} from 'react'
import { AssistantHtmlFrame } from '@/components/assistant/AssistantHtmlFrame'
import { formatDurationMs } from '@/lib/format-duration'
import type { ChatMessage } from '@/types/chat'

export type ChatViewProps = {
  baseUrl: string
  userId: string
  configOk: boolean
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
          <h1>Assistant BI</h1>
          <span className="chat-sub">ia_back</span>
        </div>
        <div className="chat-actions">
          <span className="chat-meta" title="Identifiant de session">
            chatId · {chatId.slice(0, 8)}…
          </span>
          <button type="button" className="btn ghost" onClick={newConversation}>
            Nouvelle conversation
          </button>
        </div>
      </header>

      {!configOk && (
        <div className="config-banner" role="status">
          Fichier <code>.env</code> : renseignez <code>VITE_X_API_CONFIG</code> et{' '}
          <code>VITE_USER_ID</code> (et optionnellement <code>VITE_API_BASE</code>
          ), puis relancez <code>npm run dev</code>.
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
              Posez une question sur les données. <kbd>Shift+Entrée</kbd> pour
              une nouvelle ligne.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}
            >
              {msg.role === 'user' && (
                <div className="bubble-label">Vous</div>
              )}
              {msg.role === 'assistant' && (
                <div className="bubble-label">Assistant</div>
              )}
              {msg.text && <div className="bubble-text">{msg.text}</div>}
              {msg.html && <AssistantHtmlFrame html={msg.html} />}
              {msg.durationMs != null && (
                <div
                  className="bubble-timing"
                  title="Durée mesurée côté navigateur (appel complet)"
                >
                  {formatDurationMs(msg.durationMs)}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble assistant typing stream-bubble">
              <div className="bubble-label">Assistant</div>
              {streamLines.length > 0 && (
                <>
                  <p className="stream-log-hint">
                    Analyse des données en cours...
                  </p>
                  <ol
                    className="stream-log"
                    ref={streamListRef}
                    aria-label="Étapes intermédiaires avant la réponse"
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
              ? 'Votre message…'
              : 'Configurez le .env pour envoyer des messages'
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
          {loading ? '…' : 'Envoyer'}
        </button>
      </footer>

      <div className="chat-footer-tech">
        <code>{baseUrl}</code>
        {userId && (
          <span>
            · user <code>{userId}</code>
          </span>
        )}
        {lastRaw !== null && (
          <button
            type="button"
            className="linkish"
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? 'Masquer' : 'Voir'} le JSON
          </button>
        )}
      </div>
      {showRaw && lastRaw !== null && (
        <pre className="raw-json">{JSON.stringify(lastRaw, null, 2)}</pre>
      )}
    </div>
  )
}
