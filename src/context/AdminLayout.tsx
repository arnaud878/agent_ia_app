import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { PageWait } from '@/components/feedback/PageWait'
import { AdminIamContext } from '@/context/admin-iam.context'
import { t } from '@/i18n'
import { useAdminIam } from '@/hooks/use-admin-iam'
import '../styles/admin.css'

/**
 * Garde admin + un seul état IAM, menu vertical des sous-sections, contenu à droite.
 */
export function AdminLayout() {
  const { isAdmin, user, loading } = useAuth()
  const adminIam = useAdminIam()
  if (loading) {
    return <PageWait />
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return (
    <AdminIamContext.Provider value={adminIam}>
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label={t('nav.admin')}>
          <h2 className="admin-sidebar-title">{t('nav.admin')}</h2>
          <nav className="admin-sidebar-nav">
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                (isActive ? 'admin-nav-link is-active' : 'admin-nav-link') as
                  string
              }
            >
              {t('nav.adminUsers')}
            </NavLink>
            <NavLink
              to="/admin/roles"
              className={({ isActive }) =>
                (isActive ? 'admin-nav-link is-active' : 'admin-nav-link') as
                  string
              }
            >
              {t('nav.adminRoles')}
            </NavLink>
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </AdminIamContext.Provider>
  )
}
