import { useI18n } from '@/i18n'
import { useAdminIamContext } from '@/hooks/useAdminIamContext'
import '../styles/admin.css'

export function AdminLlmPage() {
  const { t } = useI18n()
  const a = useAdminIamContext()

  return (
    <div className="admin-page">
      <h1>{t('admin.titleLlm')}</h1>
      <p className="sub">{t('admin.introLlm')}</p>
      {a.error && <p className="form-error">{a.error}</p>}
      {a.success && <div className="admin-toast success">{a.success}</div>}

      <section className="admin-section">
        <p className="sub">{t('admin.llmHint')}</p>
        <div className="form-row" style={{ maxWidth: '42rem' }}>
          <label htmlFor="llm-provider">{t('admin.llmProvider')}</label>
          <select
            id="llm-provider"
            value={a.llmProvider}
            onChange={(e) => a.setLlmProvider(e.target.value as 'gemini' | 'gpt' | 'claude')}
          >
            <option value="gemini">Gemini</option>
            <option value="gpt">GPT</option>
            <option value="claude">Claude</option>
          </select>
        </div>
        <div className="form-row" style={{ maxWidth: '42rem' }}>
          <label htmlFor="llm-model">{t('admin.llmModel')}</label>
          <input
            id="llm-model"
            type="text"
            value={a.llmModel}
            onChange={(e) => a.setLlmModel(e.target.value)}
            placeholder="gemini-2.5-flash / gpt-4.1-mini / claude-3-5-sonnet-latest"
          />
        </div>
        <div className="form-row" style={{ maxWidth: '42rem' }}>
          <label htmlFor="llm-api-key">
            {t('admin.llmApiKey')}
            {a.llmHasApiKey ? ` (${t('admin.llmApiKeyStored')})` : ''}
          </label>
          <input
            id="llm-api-key"
            type="password"
            value={a.llmApiKey}
            onChange={(e) => a.setLlmApiKey(e.target.value)}
            placeholder={t('admin.llmApiKeyPlaceholder')}
          />
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn primary" onClick={a.onSaveLlmSettings}>
            {t('admin.llmSave')}
          </button>
        </div>
      </section>
    </div>
  )
}

