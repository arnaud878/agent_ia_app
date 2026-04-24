import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useI18n } from '@/i18n'
import '../styles/admin.css'

export function LoginPage() {
  const { t } = useI18n()
  const { login, user, authConfig, configLoaded } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (user) {
    return (
      <div className="page-form">
        <p>
          {t('auth.login.already')} {user.email}
        </p>
        <p>
          <Link to="/">{t('auth.login.backChat')}</Link>
        </p>
      </div>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    setPending(true)
    void (async () => {
      try {
        await login(email.trim(), password)
        nav('/', { replace: true })
      } catch (e) {
        setErr(e instanceof Error ? e.message : t('auth.login.error'))
      } finally {
        setPending(false)
      }
    })()
  }

  return (
    <div className="page-form">
      <h1>{t('auth.login.title')}</h1>
      <p className="sub">
        {configLoaded && authConfig?.publicRegister
          ? t('auth.login.sub.register')
          : t('auth.login.sub.default')}
      </p>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <label htmlFor="em">{t('auth.login.email')}</label>
          <input
            id="em"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="pw">{t('auth.login.password')}</label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err && <p className="form-error">{err}</p>}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? t('auth.login.submitting') : t('auth.login.submit')}
        </button>
        <p className="sub" style={{ marginTop: '1rem' }}>
          <Link to="/register">{t('auth.login.linkRegister')}</Link>
        </p>
      </form>
    </div>
  )
}
