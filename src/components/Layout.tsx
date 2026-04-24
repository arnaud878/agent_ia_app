import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useI18n, type AppLocale } from '@/i18n'
import { useTheme } from '@/theme/ThemeContext'
import '../styles/chat-app.css'

const LOCALE_FLAG: Record<AppLocale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

export function Layout() {
  const { t, locale, setLocale } = useI18n()
  const { theme, toggleTheme } = useTheme()
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
        <div className="nav-toolbar-end">
          <div className="nav-locale">
            <span className="nav-locale-label">{t('nav.theme')}</span>
            <button
              type="button"
              className="nav-theme-toggle btn ghost"
              onClick={() => toggleTheme()}
              aria-label={
                theme === 'light' ? t('nav.themeToDark') : t('nav.themeToLight')
              }
              title={
                theme === 'light' ? t('nav.themeToDark') : t('nav.themeToLight')
              }
            >
              {theme === 'light' ? (
                <IconSun className="nav-theme-icon nav-theme-icon--sun" />
              ) : (
                <IconMoon className="nav-theme-icon nav-theme-icon--moon" />
              )}
            </button>
          </div>
          <div className="nav-locale">
           
            <select
              className="nav-locale-select"
              value={locale}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'fr' || v === 'en') setLocale(v)
              }}
              aria-label={t('nav.localeAria')}
            >
              <option value="fr" lang="fr">
                {LOCALE_FLAG.fr} {t('nav.localeFr')}
              </option>
              <option value="en" lang="en">
                {LOCALE_FLAG.en} {t('nav.localeEn')}
              </option>
            </select>
          </div>
        </div>
        {user && (
          <>
            <span
              className="nav-user"
              style={{ fontSize: '0.85rem', opacity: 0.9 }}
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
