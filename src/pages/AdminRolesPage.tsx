import { useI18n } from '@/i18n'
import { useAdminIamContext } from '@/hooks/useAdminIamContext'
import type { RoleRow } from '@/auth/types'
import '../styles/admin.css'

export function AdminRolesPage() {
  const { t } = useI18n()
  const a = useAdminIamContext()

  return (
    <div className="admin-page">
      <h1>{t('admin.titleRoles')}</h1>
      <p className="sub">{t('admin.introRoles')}</p>
      {a.error && <p className="form-error">{a.error}</p>}

      <section className="admin-section">
        <h2>{t('admin.roles')}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.thName')}</th>
              <th>{t('admin.thSlug')}</th>
              <th>{t('admin.thAccess')}</th>
              <th>{t('admin.thTables')}</th>
              <th> </th>
            </tr>
          </thead>
          <tbody>
            {a.roles.map((r: RoleRow) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>
                  <code>{r.slug}</code>
                </td>
                <td>
                  {r.accessAll
                    ? t('admin.accessAll')
                    : t('admin.accessRestricted')}
                </td>
                <td>
                  {r.accessAll
                    ? t('admin.tablesDash')
                    : r.tables.length
                      ? r.tables.join(', ')
                      : t('admin.tablesNone')}
                </td>
                <td>
                  {!r.accessAll && (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => a.openTableEditor(r)}
                    >
                      {t('admin.editTables')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{t('admin.createRole.h3')}</h3>
        <form onSubmit={a.onCreateRole} className="form-grid">
          <input
            placeholder={t('admin.createRole.namePh')}
            value={a.newRoleName}
            onChange={(e) => a.setNewRoleName(e.target.value)}
            required
          />
          <input
            placeholder={t('admin.createRole.slugPh')}
            value={a.newRoleSlug}
            onChange={(e) => a.setNewRoleSlug(e.target.value)}
            required
          />
          <label>
            <input
              type="checkbox"
              checked={a.newRoleAll}
              onChange={(e) => a.setNewRoleAll(e.target.checked)}
            />{' '}
            {t('admin.createRole.allTables')}
          </label>
          <input
            placeholder={t('admin.createRole.descPh')}
            value={a.newRoleDesc}
            onChange={(e) => a.setNewRoleDesc(e.target.value)}
          />
          <button type="submit" className="btn primary">
            {t('admin.createRole.submit')}
          </button>
        </form>
      </section>

      {a.tableEditRoleId && (
        <div className="modal-backdrop" role="dialog" aria-modal>
          <div className="modal">
            <h3>{t('admin.modal.title')}</h3>
            <p className="sub">{t('admin.modal.hint')}</p>
            <ul className="table-checks">
              {a.biTables.map((tableName) => (
                <li key={tableName}>
                  <label>
                    <input
                      type="checkbox"
                      checked={a.tableSelection[tableName] ?? false}
                      onChange={(e) =>
                        a.setTableSelection((s) => ({
                          ...s,
                          [tableName]: e.target.checked,
                        }))
                      }
                    />
                    <code>{tableName}</code>
                  </label>
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => a.setTableEditRoleId(null)}
              >
                {t('admin.modal.cancel')}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={a.onSaveRoleTables}
              >
                {t('admin.modal.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
