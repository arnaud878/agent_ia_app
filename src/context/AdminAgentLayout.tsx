import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAppEnv } from '@/config/env'
import { useAuth } from '@/auth/AuthContext'
import { apiListAgentPrompts, type AgentPromptListRowDto } from '@/api/iam-client'
import { useI18n } from '@/i18n'
import '../styles/admin.css'

/**
 * Section Administration — Agent IA : LLM + sous-menus pour chaque prompt stocké en base.
 */
export function AdminAgentLayout() {
  const { t, locale } = useI18n()
  const { token } = useAuth()
  const baseUrl = getAppEnv().baseUrl
  const [prompts, setPrompts] = useState<AgentPromptListRowDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      return
    }
    void (async () => {
      try {
        const rows = await apiListAgentPrompts(baseUrl, token)
        setPrompts(rows)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.errorLoad'))
        setPrompts([])
      }
    })()
  }, [baseUrl, token, t])

  const label = (row: AgentPromptListRowDto) =>
    locale === 'en' ? row.labelEn : row.labelFr

  return (
    <div className="admin-agent-shell">
      <aside className="admin-agent-subnav" aria-label={t('nav.adminAgent')}>
        <h3 className="admin-agent-subtitle">{t('nav.adminAgent')}</h3>
        <NavLink
          to="/admin/agent/llm"
          className={({ isActive }) =>
            (isActive ? 'admin-nav-link is-active' : 'admin-nav-link') as string
          }
        >
          {t('admin.agentSubnavLlm')}
        </NavLink>
        {error && <p className="form-error">{error}</p>}
        {prompts?.map((row) => (
          <NavLink
            key={row.id}
            to={`/admin/agent/prompts/${row.id}`}
            className={({ isActive }) =>
              (isActive ? 'admin-nav-link is-active' : 'admin-nav-link') as
                string
            }
            title={row.fileName}
          >
            <span className="admin-agent-nav-label">{label(row)}</span>
            <span
              className={
                row.isCustomized
                  ? 'admin-agent-source is-db'
                  : 'admin-agent-source is-file'
              }
            >
              {row.isCustomized
                ? t('admin.agentSourceCustom')
                : t('admin.agentSourceDefault')}
            </span>
          </NavLink>
        ))}
      </aside>
      <div className="admin-agent-content">
        <Outlet />
      </div>
    </div>
  )
}
