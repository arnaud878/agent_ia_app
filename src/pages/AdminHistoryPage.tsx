import { useCallback, useEffect, useRef, useState } from 'react'
import { getAppEnv } from '@/config/env'
import { useAuth } from '@/auth/AuthContext'
import { AssistantHtmlFrame } from '@/components/assistant/AssistantHtmlFrame'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme/ThemeContext'
import {
  apiAdminListTurns,
  apiAdminDeleteConversation,
  type TurnRow,
  type PaginatedResult,
} from '@/api/iam-client'
import '../styles/admin.css'

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

export function AdminHistoryPage() {
  const { t } = useI18n()
  const { theme: colorScheme } = useTheme()
  const { token } = useAuth()
  const baseUrl = getAppEnv().baseUrl

  const [data, setData] = useState<PaginatedResult<TurnRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [detailTurn, setDetailTurn] = useState<TurnRow | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const limit = 50

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiAdminListTurns(baseUrl, token, {
        page,
        limit,
        search: search || undefined,
      })
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [token, baseUrl, page, limit, search, t])

  useEffect(() => { void load() }, [load])

  const onSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setPage(1), 400)
  }

  const closeDetail = () => setDetailTurn(null)

  const confirmDelete = async (convId: string) => {
    if (!token) return
    if (!window.confirm(t('admin.history.deleteConfirm'))) return
    setDeleting(convId)
    try {
      await apiAdminDeleteConversation(baseUrl, token, convId)
      if (detailTurn?.conversationId === convId) closeDetail()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setDeleting(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <div className="admin-page admin-page-history">
      <h1>{t('admin.titleHistory')}</h1>
      <p className="sub">{t('admin.introHistory')}</p>

      {error && <p className="form-error">{error}</p>}

      <section className="admin-section">
        <div className="filters-row">
          <input
            type="text"
            className="search-input"
            placeholder={t('admin.history.search')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : data && data.rows.length > 0 ? (
          <>
            <div className="history-table-wrap">
              <table className="data-table history-table">
                <thead>
                  <tr>
                    <th className="col-date">{t('admin.thDate')}</th>
                    <th className="col-user">{t('admin.thUser')}</th>
                    <th className="col-conv">{t('admin.thConversation')}</th>
                    <th className="col-msg">{t('admin.thMessage')}</th>
                    <th className="col-sql">{t('admin.thSql')}</th>
                    <th className="col-dur">{t('admin.thDuration')}</th>
                    <th className="col-actions">{t('admin.thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((turn) => (
                    <tr key={turn.userMsgId}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                        {new Date(turn.userCreatedAt).toLocaleString()}
                      </td>
                      <td><code style={{ fontSize: '0.8rem' }}>{turn.userEmail}</code></td>
                      <td><code style={{ fontSize: '0.8rem' }}>{turn.displayKey}</code></td>
                      <td className="cell-text">{truncate(turn.userText, 100)}</td>
                      <td className="cell-sql">{truncate(turn.requeteSQL, 70)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {turn.durationMs != null ? `${(turn.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="cell-actions" style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setDetailTurn(turn)}
                          style={{ fontSize: '0.82rem', padding: '0.3rem 0.55rem' }}
                        >
                          {t('admin.viewMessages')}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => void confirmDelete(turn.conversationId)}
                          disabled={deleting === turn.conversationId}
                          style={{ fontSize: '0.82rem', padding: '0.3rem 0.55rem', color: '#b91c1c', borderColor: '#b91c1c' }}
                        >
                          {deleting === turn.conversationId ? t('common.loading') : t('chat.conversations.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button type="button" className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t('admin.history.prev')}
                </button>
                <span style={{ padding: '0 0.75rem', fontSize: '0.88rem' }}>{page} / {totalPages}</span>
                <button type="button" className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  {t('admin.history.next')}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="sub">{t('chat.conversations.empty')}</p>
        )}
      </section>

      {detailTurn && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal
          onClick={(e) => { if (e.target === e.currentTarget) closeDetail() }}
        >
          <div className="modal history-detail-modal">
            {/* En-tête */}
            <div className="detail-modal-header">
              <div>
                <span className="detail-modal-email">{detailTurn.userEmail}</span>
                <code style={{ marginLeft: '0.5rem', fontSize: '0.78rem', opacity: 0.65 }}>{detailTurn.displayKey}</code>
                {detailTurn.title && (
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.88rem', opacity: 0.8 }}>— {detailTurn.title}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void confirmDelete(detailTurn.conversationId)}
                  disabled={deleting === detailTurn.conversationId}
                  style={{ color: '#b91c1c', borderColor: '#b91c1c', fontSize: '0.82rem' }}
                >
                  {deleting === detailTurn.conversationId ? t('common.loading') : t('chat.conversations.delete')}
                </button>
                <button type="button" className="btn ghost" onClick={closeDetail} style={{ padding: '0.3rem 0.6rem' }}>✕</button>
              </div>
            </div>

            {/* Corps : question + réponse uniquement */}
            <div className="detail-modal-body">
              <div className="turn-block">
                {/* Question utilisateur */}
                <div className="turn-user">
                  <span className="role-badge user">{t('chat.role.user')}</span>
                  <span className="turn-user-text">{detailTurn.userText ?? '—'}</span>
                  <span className="turn-date">{new Date(detailTurn.userCreatedAt).toLocaleString()}</span>
                </div>

                {/* Réponse IA */}
                <div className="turn-ai">
                  <div className="turn-ai-meta">
                    <span className="role-badge assistant">{t('chat.role.assistant')}</span>
                    {detailTurn.durationMs != null && (
                      <span className="turn-duration">{(detailTurn.durationMs / 1000).toFixed(1)}s</span>
                    )}
                    {detailTurn.aiCreatedAt && (
                      <span className="turn-date">{new Date(detailTurn.aiCreatedAt).toLocaleString()}</span>
                    )}
                  </div>

                  {detailTurn.requeteSQL ? (
                    <div className="detail-section">
                      <strong className="detail-label">{t('admin.thSql')}</strong>
                      <pre className="detail-pre sql-pre">{detailTurn.requeteSQL}</pre>
                    </div>
                  ) : null}

                  {detailTurn.resultatSQL ? (
                    <div className="detail-section">
                      <strong className="detail-label">{t('admin.thResult')}</strong>
                      <pre className="detail-pre">{detailTurn.resultatSQL}</pre>
                    </div>
                  ) : null}

                  {!detailTurn.requeteSQL && !detailTurn.resultatSQL && (detailTurn.aiText || detailTurn.aiHtml) && (
                    <div className="detail-section">
                      <pre className="detail-pre">
                        {truncate(detailTurn.aiText ?? detailTurn.aiHtml, 800)}
                      </pre>
                    </div>
                  )}

                  {detailTurn.aiHtml && (
                    <div className="detail-section">
                      <strong className="detail-label">Rendu HTML</strong>
                      <AssistantHtmlFrame
                        messageId={detailTurn.aiMsgId ?? detailTurn.userMsgId}
                        html={detailTurn.aiHtml}
                        colorScheme={colorScheme}
                      />
                    </div>
                  )}

                  {!detailTurn.aiMsgId && (
                    <p style={{ opacity: 0.5, fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                      {t('admin.history.noMessages')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
