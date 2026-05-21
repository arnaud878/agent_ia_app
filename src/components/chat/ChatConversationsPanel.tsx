import { useI18n } from '@/i18n'
import type { ConversationRow } from '@/api/chat-conversations'

type Props = {
  conversations: ConversationRow[] | undefined
  loading: boolean
  error: boolean
  activeId: string
  loadingConversationIds?: ReadonlySet<string>
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onCollapse: () => void
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatListTitle(c: ConversationRow, untitled: string) {
  const t = c.title?.trim()
  if (t) {
    return t
  }
  return untitled
}

export function ChatConversationsPanel({
  conversations,
  loading,
  error,
  activeId,
  loadingConversationIds,
  onSelect,
  onDelete,
  onCollapse,
}: Props) {
  const { t } = useI18n()
  const list = conversations ?? []

  return (
    <aside
      id="chat-conversations-panel"
      className="chat-conversations"
      aria-label={t('chat.conversations.title')}
    >
        <div className="chat-conv-header">
          <h2 className="chat-conv-title">{t('chat.conversations.title')}</h2>
          <button
            type="button"
            className="chat-conv-collapse"
            onClick={onCollapse}
            aria-expanded
            aria-controls="chat-conversations-panel"
            aria-label={t('chat.conversations.hideListAria')}
            title={t('chat.conversations.hideList')}
          >
            <IconChevronLeft />
          </button>
        </div>
        {loading && <p className="chat-conv-status">{t('common.loading')}</p>}
        {error && <p className="chat-conv-status error">{t('common.error')}</p>}
        {!loading && !error && list.length === 0 && (
          <p className="chat-conv-hint">{t('chat.conversations.empty')}</p>
        )}
        <ul className="chat-conv-list" role="list">
          {list.map((c) => {
            const inFlight = loadingConversationIds?.has(c.id) ?? false
            return (
            <li key={c.id} className="chat-conv-item-wrap">
              <button
                type="button"
                className={
                  c.id === activeId ? 'chat-conv-item is-active' : 'chat-conv-item'
                }
                onClick={() => onSelect(c.id)}
                title={c.title?.trim() || t('chat.conversations.untitled')}
              >
                <span className="chat-conv-item-label">
                  <span className="chat-conv-item-title">
                    {formatListTitle(c, t('chat.conversations.untitled'))}
                  </span>
                  {inFlight && (
                    <span className="chat-conv-item-busy" aria-hidden>
                      …
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="chat-conv-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(c.id)
                }}
                title={t('chat.conversations.delete')}
                aria-label={t('chat.conversations.deleteAria')}
              >
                ×
              </button>
            </li>
          )})}
        </ul>
    </aside>
  )
}
