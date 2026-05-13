import {
  useCallback,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import { pdf } from '@react-pdf/renderer'
import { AssistantHtmlFrame } from '@/components/assistant/AssistantHtmlFrame'
import { ChatPdfDocument } from '@/components/pdf/ChatPdfDocument'
import {
  collectAssistantChartDataUrls,
  waitForChartsBeforePdfCapture,
} from '@/lib/pdf/collect-assistant-chart-images'
import { ChatConversationsPanel } from '@/components/chat/ChatConversationsPanel'
import type { ConversationAttachmentRow, ConversationRow } from '@/api/chat-conversations'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme/ThemeContext'
import { formatDurationMs } from '@/lib/format-duration'
import type { BiResponseMode } from '@/api/bi-webhook'
import type { ChatMessage } from '@/types/chat'

export type ChatViewProps = {
  baseUrl: string
  userId: string
  configOk: boolean
  /** Si true, pas d’accès par clé .env (config serveur VITE/WEBHOOK_JWT_ONLY) */
  sessionOnly: boolean
  chatId: string
  /** Clé courte affichée (serveur) ; si vide, repli sur le début d’UUID */
  displayKey: string
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
  showConversationList: boolean
  conversations: ConversationRow[] | undefined
  conversationsLoading: boolean
  conversationsError: boolean
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => void
  responseMode: BiResponseMode
  setResponseMode: Dispatch<SetStateAction<BiResponseMode>>
  attachments: ConversationAttachmentRow[]
  selectedAttachmentIds: string[]
  uploadingAttachment: boolean
  uploadAttachment: (file: File) => void | Promise<void>
  deleteAttachment: (attachmentId: string) => void | Promise<void>
  toggleAttachmentSelection: (attachmentId: string) => void
}

function safePdfFileBase(displayKey: string, chatId: string): string {
  const raw = (displayKey.trim() || chatId.slice(0, 8)).replace(
    /[^a-zA-Z0-9._-]+/g,
    '_',
  )
  const base = raw.slice(0, 80)
  return base || 'conversation'
}

export function ChatView(props: ChatViewProps) {
  const { t, locale } = useI18n()
  const { theme: colorScheme } = useTheme()
  const {
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
    liveElapsedMs,
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
    responseMode,
    setResponseMode,
    attachments,
    selectedAttachmentIds,
    uploadingAttachment,
    uploadAttachment,
    deleteAttachment,
    toggleAttachmentSelection,
  } = props

  const exportPdf = useCallback(async () => {
    try {
      await waitForChartsBeforePdfCapture()
      const chartDataUrlsByMessageId: Record<string, string[]> = {}
      for (const m of messages) {
        if (m.role === 'assistant' && m.html) {
          chartDataUrlsByMessageId[m.id] = collectAssistantChartDataUrls(m.id)
        }
      }

      const blob = await pdf(
        <ChatPdfDocument
          theme={colorScheme}
          messages={messages}
          chartDataUrlsByMessageId={chartDataUrlsByMessageId}
          labels={{
            headerTitle: t('chat.title'),
            metaDisplayKey: `${t('chat.displayKey')} · ${displayKey.trim() || `${chatId.slice(0, 8)}…`}`,
            metaExportedAt: `${t('chat.exportPdfDate')}: ${new Date().toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')}`,
            roleUser: t('chat.role.user'),
            roleAssistant: t('chat.role.assistant'),
          }}
        />,
      ).toBlob()
      const base = safePdfFileBase(displayKey, chatId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${base}.pdf`
      a.rel = 'noopener'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.alert(t('chat.exportPdfError'))
    }
  }, [
    chatId,
    colorScheme,
    displayKey,
    locale,
    messages,
    t,
  ])

  return (
    <div className="chat-app-layout">
      {showConversationList && (
        <ChatConversationsPanel
          conversations={conversations}
          loading={conversationsLoading}
          error={conversationsError}
          activeId={chatId}
          onSelect={selectConversation}
          onDelete={deleteConversation}
        />
      )}
      <div className="chat-app">
        <header className="chat-header">
        <div className="chat-brand">
          <h1>{t('chat.title')}</h1>
        </div>
        <div className="chat-actions">
          <span className="chat-meta" title={t('chat.sessionTitle')}>
            {t('chat.displayKey')} ·{' '}
            {displayKey.trim() || `${chatId.slice(0, 8)}…`}
          </span>
          <button type="button" className="btn ghost" onClick={newConversation}>
            {t('chat.newConversation')}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void exportPdf()}
            disabled={messages.length === 0}
            aria-label={t('chat.exportPdfAria')}
          >
            {t('chat.exportPdf')}
          </button>
        </div>
      </header>
      {!showConversationList && (
        <p className="chat-header-hint" role="note">
          {t('chat.conversations.loginHint')}
        </p>
      )}

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
              {msg.role === 'user' && msg.text && (
                <div className="bubble-text">{msg.text}</div>
              )}
              {msg.role === 'assistant' &&
                (msg.html ? (
                  <AssistantHtmlFrame
                    messageId={msg.id}
                    html={msg.html}
                    colorScheme={colorScheme}
                  />
                ) : (
                  msg.text && (
                    <div className="bubble-text">{msg.text}</div>
                  )
                ))}
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
              <p className="stream-log-hint">{t('chat.streamHint')}</p>
              {streamLines.length > 0 && (
                <ol
                  className="stream-log"
                  ref={streamListRef}
                  aria-label={t('chat.streamLogLabel')}
                >
                  {streamLines.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 32)}`}>{line}</li>
                  ))}
                </ol>
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
        <div className="chat-composer-main">
          <textarea
            className="chat-input"
            rows={1}
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
          {showConversationList && (
            <div className="chat-attachments">
              <label className="chat-attachments-upload">
                <input
                  type="file"
                  disabled={!configOk || loading || uploadingAttachment}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      void uploadAttachment(file)
                    }
                    e.currentTarget.value = ''
                  }}
                />
                <span>
                  {uploadingAttachment
                    ? t('chat.attach.uploading')
                    : t('chat.attach.button')}
                </span>
              </label>
              {attachments.length > 0 && (
                <div className="chat-attachments-list">
                  {attachments.map((a) => {
                    const checked = selectedAttachmentIds.includes(a.id)
                    return (
                      <label key={a.id} className="chat-attachment-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAttachmentSelection(a.id)}
                          disabled={loading}
                        />
                        <span title={a.fileName}>{a.fileName}</span>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => void deleteAttachment(a.id)}
                          disabled={loading}
                        >
                          {t('chat.attach.delete')}
                        </button>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="chat-composer-actions">
          <label className="chat-mode-field">
            <select
              className="chat-mode-select"
              value={responseMode}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'quick' || v === 'pro') {
                  setResponseMode(v)
                }
              }}
              disabled={loading}
              aria-label={t('chat.responseModeAria')}
            >
              <option value="quick">{t('chat.responseModeQuick')}</option>
              <option value="pro">{t('chat.responseModePro')}</option>
            </select>
          </label>
          <button
            type="button"
            className="btn send chat-composer-send"
            onClick={() => void send()}
            disabled={!configOk || loading || !draft.trim()}
          >
            {loading ? t('chat.sending') : t('chat.send')}
          </button>
        </div>
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
    </div>
  )
}
