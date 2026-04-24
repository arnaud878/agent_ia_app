import { useI18n } from '@/i18n'
import type { ConversationRow } from '@/api/chat-conversations'

type Props = {
  conversations: ConversationRow[] | undefined
  loading: boolean
  error: boolean
  activeId: string
  onSelect: (id: string) => void
  onDelete: (id: string) => void
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
  onSelect,
  onDelete,
}: Props) {
  const { t } = useI18n()
  const list = conversations ?? []

  return (
    <aside
      className="chat-conversations"
      aria-label={t('chat.conversations.title')}
    >
        <h2 className="chat-conv-title">{t('chat.conversations.title')}</h2>
        {loading && <p className="chat-conv-status">{t('common.loading')}</p>}
        {error && <p className="chat-conv-status error">{t('common.error')}</p>}
        {!loading && !error && list.length === 0 && (
          <p className="chat-conv-hint">{t('chat.conversations.empty')}</p>
        )}
        <ul className="chat-conv-list" role="list">
          {list.map((c) => (
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
                  {formatListTitle(c, t('chat.conversations.untitled'))}
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
          ))}
        </ul>
    </aside>
  )
}
