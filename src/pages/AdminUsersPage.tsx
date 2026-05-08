import { useState, type FormEvent } from 'react'
import { getAppEnv } from '@/config/env'
import { useAuth } from '@/auth/AuthContext'
import { useAdminIamContext } from '@/hooks/useAdminIamContext'
import { apiUpdateUser } from '@/api/iam-client'
import type { UserRow } from '@/auth/types'
import { useI18n } from '@/i18n'
import '../styles/admin.css'

export function AdminUsersPage() {
  const { t } = useI18n()
  const a = useAdminIamContext()
  const { user: sessionUser } = useAuth()
  const baseUrl = getAppEnv().baseUrl
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editRoleId, setEditRoleId] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editPassword, setEditPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const openEdit = (u: UserRow) => {
    a.setError(null)
    a.setSuccess(null)
    setEditUser(u)
    setEditRoleId(u.roleId)
    setEditActive(u.active)
    setEditPassword('')
  }

  const onSubmitEdit = (e: FormEvent) => {
    e.preventDefault()
    if (!a.token || !editUser) {
      return
    }
    setSaving(true)
    a.setError(null)
    a.setSuccess(null)
    const body: { roleId?: string; active?: boolean; password?: string } = {}
    if (editRoleId !== editUser.roleId) {
      body.roleId = editRoleId
    }
    if (editActive !== editUser.active) {
      body.active = editActive
    }
    if (editPassword.trim().length > 0) {
      if (editPassword.length < 8) {
        a.setError(t('admin.userEdit.pwMin'))
        setSaving(false)
        return
      }
      body.password = editPassword
    }
    if (Object.keys(body).length === 0) {
      a.setError(t('admin.userEdit.nothingToSave'))
      setSaving(false)
      return
    }
    const tok = a.token
    if (!tok) {
      setSaving(false)
      return
    }
    void (async () => {
      try {
        await apiUpdateUser(baseUrl, tok, editUser.id, body)
        setEditUser(null)
        setEditPassword('')
        await a.load()
        a.setSuccess(t('admin.success.userUpdated'))
      } catch (e) {
        a.setError(e instanceof Error ? e.message : t('common.error'))
      } finally {
        setSaving(false)
      }
    })()
  }

  const isSelf = Boolean(
    sessionUser && editUser && editUser.id === sessionUser.id,
  )

  return (
    <div className="admin-page">
      <h1>{t('admin.titleUsers')}</h1>
      <p className="sub">{t('admin.introUsers')}</p>
      {a.error && <p className="form-error">{a.error}</p>}
      {a.success && <div className="admin-toast success">{a.success}</div>}

      <section className="admin-section">
        <h2>{t('admin.users')}</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.thEmail')}</th>
              <th>{t('admin.thRole')}</th>
              <th>{t('admin.thActive')}</th>
              <th>{t('admin.thActions')}</th>
            </tr>
          </thead>
          <tbody>
            {a.users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <code>{u.roleSlug}</code> · {u.roleName}
                </td>
                <td>{u.active ? t('common.yes') : t('common.no')}</td>
                <td>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => openEdit(u)}
                  >
                    {t('admin.userEdit.open')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{t('admin.createUser.h3')}</h3>
        <form onSubmit={a.onCreateUser} className="inline-form">
          <input
            type="email"
            placeholder={t('admin.createUser.emailPh')}
            value={a.newUserEmail}
            onChange={(e) => a.setNewUserEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('admin.createUser.pwPh')}
            value={a.newUserPassword}
            onChange={(e) => a.setNewUserPassword(e.target.value)}
            minLength={8}
            required
          />
          <select
            value={a.newUserRoleId}
            onChange={(e) => a.setNewUserRoleId(e.target.value)}
            required
          >
            <option value="">{t('admin.createUser.roleSelect')}</option>
            {a.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.slug})
              </option>
            ))}
          </select>
          <button type="submit" className="btn primary">
            {t('admin.createUser.submit')}
          </button>
        </form>
      </section>

      {editUser && (
        <div className="modal-backdrop" role="dialog" aria-modal>
          <div className="modal">
            <h3>{t('admin.userEdit.title')}</h3>
            <p className="sub">
              <code>{editUser.email}</code>
            </p>
            <form onSubmit={onSubmitEdit} className="form-grid" style={{ marginTop: '0.5rem' }}>
              <div className="form-row" style={{ maxWidth: '100%' }}>
                <label htmlFor="e-role">{t('admin.thRole')}</label>
                <select
                  id="e-role"
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  required
                >
                  {a.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row" style={{ maxWidth: '100%' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => {
                      if (isSelf && !e.target.checked) {
                        return
                      }
                      setEditActive(e.target.checked)
                    }}
                  />
                  {` ${t('admin.userEdit.activeLabel')}`}
                </label>
                {isSelf && (
                  <p className="sub" style={{ margin: '0.25rem 0 0' }}>
                    {t('admin.userEdit.cannotDeactivateSelf')}
                  </p>
                )}
              </div>
              <div className="form-row" style={{ maxWidth: '100%' }}>
                <label htmlFor="e-pw">{t('admin.userEdit.newPassword')}</label>
                <input
                  id="e-pw"
                  type="password"
                  autoComplete="new-password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength={8}
                  placeholder={t('admin.userEdit.pwOptional')}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setEditUser(null)
                    setEditPassword('')
                    a.setError(null)
                  }}
                  disabled={saving}
                >
                  {t('admin.modal.cancel')}
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? t('common.loading') : t('admin.modal.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
