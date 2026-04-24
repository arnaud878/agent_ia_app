import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { t } from '@/i18n'
import '../styles/chat-app.css'

export function Layout() {
  const { user, logout, isAdmin, loading } = useAuth()
  const { pathname } = useLocation()
  const isAdminPath = pathname.startsWith('/admin')

  return (
    <div
      className="app-shell"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
    >
      <nav
        className="app-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--border, #2e303a)',
          background: 'var(--code-bg, #1f2028)',
        }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            (isActive ? 'nav-a active' : 'nav-a') as string
          }
        >
          {t('nav.chat')}
        </NavLink>
        {!loading && !user && (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                (isActive ? 'nav-a active' : 'nav-a') as string
              }
            >
              {t('nav.login')}
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                (isActive ? 'nav-a active' : 'nav-a') as string
              }
            >
              {t('nav.register')}
            </NavLink>
          </>
        )}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={isAdminPath ? 'nav-a active' : 'nav-a'}
          >
            {t('nav.admin')}
          </NavLink>
        )}
        {user && (
          <>
            <span
              className="nav-user"
              style={{ marginLeft: 'auto', fontSize: '0.85rem', opacity: 0.9 }}
            >
              {user.email} · {user.roleSlug}
            </span>
            <button type="button" className="btn ghost" onClick={() => void logout()}>
              {t('nav.logout')}
            </button>
          </>
        )}
      </nav>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  )
}
