import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useI18n, type AppLocale } from '@/i18n'
import { useTheme, type AppTheme } from '@/theme/ThemeContext'
import '../styles/chat-app.css'

const LOCALE_FLAG: Record<AppLocale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
}

export function Layout() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
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
        <div className="nav-locale">
          <span className="nav-locale-label">{t('nav.theme')}</span>
          <select
            className="nav-locale-select"
            value={theme}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'light' || v === 'dark') {
                setTheme(v as AppTheme)
              }
            }}
            aria-label={t('nav.themeAria')}
          >
            <option value="light">{t('nav.themeLight')}</option>
            <option value="dark">{t('nav.themeDark')}</option>
          </select>
        </div>
        <div className="nav-locale">
          <span className="nav-locale-label">{t('nav.locale')}</span>
          <span
            className="nav-locale-flag"
            aria-hidden
            title={locale === 'fr' ? t('nav.localeFr') : t('nav.localeEn')}
          >
            {LOCALE_FLAG[locale]}
          </span>
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
