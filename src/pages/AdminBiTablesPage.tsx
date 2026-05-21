import { useState } from 'react'
import { useI18n } from '@/i18n'
import { useAdminIamContext } from '@/hooks/useAdminIamContext'
import '../styles/admin.css'

export function AdminBiTablesPage() {
  const { t } = useI18n()
  const a = useAdminIamContext()
  const [tab, setTab] = useState<'tables' | 'connection'>('tables')

  return (
    <div className="admin-page">
      <h1>{t('admin.titleBiTables')}</h1>
      <p className="sub">{t('admin.introBiTables')}</p>
      {a.error && <p className="form-error">{a.error}</p>}
      {a.success && <div className="admin-toast success">{a.success}</div>}

      <section className="admin-section">
        <div className="bi-base-tabs">
          <button
            type="button"
            className={tab === 'tables' ? 'btn primary' : 'btn ghost'}
            onClick={() => setTab('tables')}
          >
            {t('admin.biTablesList')}
          </button>
          <button
            type="button"
            className={tab === 'connection' ? 'btn primary' : 'btn ghost'}
            onClick={() => setTab('connection')}
          >
            {t('admin.biConnectionTab')}
          </button>
        </div>

        {tab === 'tables' ? (
          <>
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
          </>
        ) : (
          <>
            <p className="sub">{t('admin.biConnectionHint')}</p>
            <div className="form-row" style={{ maxWidth: '52rem' }}>
              <label htmlFor="bi-db-type">{t('admin.biDbTypeLabel')}</label>
              <select
                id="bi-db-type"
                value={a.biDbType}
                onChange={(e) =>
                  a.setBiDbType(e.target.value as 'postgresql' | 'mysql')
                }
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL / MariaDB</option>
              </select>
            </div>
            <div className="form-row" style={{ maxWidth: '52rem' }}>
              <label htmlFor="bi-conn">{t('admin.biConnectionLabel')}</label>
              <textarea
                id="bi-conn"
                rows={5}
                value={a.biConnectionDraft}
                onChange={(e) => a.setBiConnectionDraft(e.target.value)}
                placeholder={
                  a.biDbType === 'mysql'
                    ? 'mysql://user:pass@host:3306/database'
                    : 'postgres://user:pass@host:5432/database'
                }
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
              <button type="button" className="btn primary" onClick={a.onSaveBiConnection}>
                {t('admin.biConnectionSave')}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
