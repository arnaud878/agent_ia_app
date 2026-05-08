import { useI18n } from '@/i18n'
import { useAdminIamContext } from '@/hooks/useAdminIamContext'
import '../styles/admin.css'

export function AdminBiTablesPage() {
  const { t } = useI18n()
  const a = useAdminIamContext()

  return (
    <div className="admin-page">
      <h1>{t('admin.titleBiTables')}</h1>
      <p className="sub">{t('admin.introBiTables')}</p>
      {a.error && <p className="form-error">{a.error}</p>}
      {a.success && <div className="admin-toast success">{a.success}</div>}

      <section className="admin-section">
        <h2>{t('admin.biTablesList')}</h2>
        <p className="sub">{t('admin.biTablesHint')}</p>
        <div className="form-row" style={{ maxWidth: '42rem' }}>
          <textarea
            rows={16}
            value={a.biTablesDraft}
            onChange={(e) => a.setBiTablesDraft(e.target.value)}
            placeholder={'irradiance\nproduction\npuissance_installee'}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.4,
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg, var(--bg))',
              color: 'var(--text-h)',
            }}
          />
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn primary" onClick={a.onSaveBiTables}>
            {t('admin.biTablesSave')}
          </button>
        </div>
      </section>
    </div>
  )
}
