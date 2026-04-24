import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { PageWait } from '@/components/feedback/PageWait'
import { useI18n } from '@/i18n'
import '../styles/admin.css'

export function RegisterPage() {
  const { t } = useI18n()
  const { register, user, authConfig, configLoaded } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    setPending(true)
    void (async () => {
      try {
        await register(email.trim(), password)
        nav('/', { replace: true })
      } catch (e) {
        setErr(e instanceof Error ? e.message : t('auth.register.error'))
      } finally {
        setPending(false)
      }
    })()
  }

  if (!configLoaded) {
    return <PageWait />
  }

  if (!authConfig?.publicRegister) {
    return (
      <div className="page-form">
        <h1>{t('auth.register.title')}</h1>
        <p className="sub">{t('auth.register.sub.disabled')}</p>
        <p>
          <Link to="/login">{t('auth.register.linkLogin')}</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="page-form">
      <h1>{t('auth.register.title')}</h1>
      <p className="sub">{t('auth.register.sub')}</p>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <label htmlFor="r-em">{t('auth.register.email')}</label>
          <input
            id="r-em"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="r-pw">{t('auth.register.password')}</label>
          <input
            id="r-pw"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {err && <p className="form-error">{err}</p>}
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
        <p className="sub" style={{ marginTop: '1rem' }}>
          <Link to="/login">{t('auth.register.linkLogin2')}</Link>
        </p>
      </form>
    </div>
  )
}
