import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAppEnv } from '@/config/env'
import { useAuth } from '@/auth/AuthContext'
import {
  apiGetAgentPrompt,
  apiPutAgentPrompt,
  type AgentPromptDetailDto,
} from '@/api/iam-client'
import { useI18n } from '@/i18n'
import '../styles/admin.css'

export function AdminAgentPromptPage() {
  const { promptId } = useParams<{ promptId: string }>()
  const { t, locale } = useI18n()
  const { token } = useAuth()
  const baseUrl = getAppEnv().baseUrl
  const [detail, setDetail] = useState<AgentPromptDetailDto | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token || !promptId) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const d = await apiGetAgentPrompt(baseUrl, token, promptId)
      setDetail(d)
      setDraft(d.effectiveBody)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.errorLoad'))
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [baseUrl, token, promptId, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!success) {
      return
    }
    const id = window.setTimeout(() => setSuccess(null), 2800)
    return () => window.clearTimeout(id)
  }, [success])

  const title = detail
    ? locale === 'en'
      ? detail.labelEn
      : detail.labelFr
    : promptId ?? ''

  const onSave = () => {
    if (!token || !promptId) {
      return
    }
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        await apiPutAgentPrompt(baseUrl, token, promptId, { body: draft })
        setSuccess(t('admin.agentPromptSaved'))
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    })()
  }

  const onResetBundled = () => {
    if (!token || !promptId) {
      return
    }
    setError(null)
    setSuccess(null)
    void (async () => {
      try {
        await apiPutAgentPrompt(baseUrl, token, promptId, { body: '' })
        setSuccess(t('admin.agentPromptReset'))
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    })()
  }

  if (loading && !detail) {
    return (
      <div className="admin-page">
        <p className="sub">{t('common.loading')}</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="admin-page">
        <p className="form-error">{error ?? t('common.errorLoad')}</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <h1>{title}</h1>
      <p className="sub">{t('admin.agentPromptIntro')}</p>
      <p className="admin-meta">
        <strong>{t('admin.agentFileLabel')}</strong> {detail.fileName} —{' '}
        <strong>{t('admin.agentActiveSource')}</strong>{' '}
        {detail.isCustomized
          ? t('admin.agentSourceCustom')
          : t('admin.agentSourceDefault')}
        {detail.updatedAt ? (
          <>
            {' '}
            — <strong>{t('admin.agentUpdated')}</strong> {detail.updatedAt}
          </>
        ) : null}
      </p>
      {error && <p className="form-error">{error}</p>}
      {success && <div className="admin-toast success">{success}</div>}

      {detail.variables.length > 0 && (
        <section className="admin-section admin-prompt-vars">
          <h2 className="admin-h2">{t('admin.agentVariables')}</h2>
          <ul className="admin-var-list">
            {detail.variables.map((v) => (
              <li key={v.token}>
                <code className="admin-var-token">{v.token}</code>
                <span className="admin-var-desc">
                  {locale === 'en' ? v.descriptionEn : v.descriptionFr}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="admin-section">
        <label htmlFor="prompt-body" className="admin-label-block">
          {t('admin.agentEditorLabel')}
        </label>
        <textarea
          id="prompt-body"
          className="admin-prompt-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={28}
        />
        <div className="admin-prompt-actions">
          <button type="button" className="btn primary" onClick={onSave}>
            {t('admin.agentSave')}
          </button>
          <button type="button" className="btn" onClick={onResetBundled}>
            {t('admin.agentResetFile')}
          </button>
        </div>
        <p className="sub">{t('admin.agentResetHint')}</p>
      </section>
    </div>
  )
}
