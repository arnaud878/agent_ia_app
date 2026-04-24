import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAppEnv } from '@/config/env'
import type { AuthPublicConfig } from '@/api/iam-client'
import { apiAuthConfig, apiLogin, apiMe, apiRegister } from '@/api/iam-client'
import { clearAuth, readStoredToken, readStoredUser, writeAuth } from './auth-storage'
import type { UserSession } from './types'

type AuthContextValue = {
  token: string | null
  user: UserSession | null
  loading: boolean
  /** GET /auth/config reçu (ou erreur = flags par défaut) */
  configLoaded: boolean
  authConfig: AuthPublicConfig | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken())
  const [user, setUser] = useState<UserSession | null>(() => readStoredUser())
  const [loading, setLoading] = useState(true)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [authConfig, setAuthConfig] = useState<AuthPublicConfig | null>(null)

  const baseUrl = getAppEnv().baseUrl

  const refreshUser = useCallback(async () => {
    const t = readStoredToken()
    if (!t) {
      setUser(null)
      setToken(null)
      return
    }
    try {
      const me = await apiMe(baseUrl, t)
      const u: UserSession = {
        id: me.id,
        email: me.email,
        roleSlug: me.roleSlug,
      }
      setUser(u)
      setToken(t)
      writeAuth(t, u)
    } catch {
      clearAuth()
      setUser(null)
      setToken(null)
    }
  }, [baseUrl])

  useEffect(() => {
    void (async () => {
      if (readStoredToken()) {
        await refreshUser()
      }
      setLoading(false)
    })()
  }, [refreshUser])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const c = await apiAuthConfig(baseUrl)
        if (!cancelled) {
          setAuthConfig(c)
        }
      } catch {
        if (!cancelled) {
          setAuthConfig({ publicRegister: false, webhookJwtOnly: false })
        }
      } finally {
        if (!cancelled) {
          setConfigLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [baseUrl])

  const applySession = useCallback(
    (accessToken: string, u: UserSession) => {
      writeAuth(accessToken, u)
      setToken(accessToken)
      setUser(u)
    },
    [],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(baseUrl, email, password)
      const u: UserSession = {
        id: res.user.id,
        email: res.user.email,
        roleSlug: res.user.roleSlug,
      }
      applySession(res.access_token, u)
    },
    [baseUrl, applySession],
  )

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await apiRegister(baseUrl, email, password)
      const u: UserSession = {
        id: res.user.id,
        email: res.user.email,
        roleSlug: res.user.roleSlug,
      }
      applySession(res.access_token, u)
    },
    [baseUrl, applySession],
  )

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  const isAdmin = user?.roleSlug === 'admin'

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      configLoaded,
      authConfig,
      login,
      register,
      logout,
      isAdmin,
      refreshUser,
    }),
    [
      token,
      user,
      loading,
      configLoaded,
      authConfig,
      login,
      register,
      logout,
      isAdmin,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* Hook partagé — le provider est le composant refreshable. */
// eslint-disable-next-line react-refresh/only-export-components -- hook + provider pattern
export function useAuth() {
  const v = useContext(AuthContext)
  if (!v) {
    throw new Error('useAuth en dehors de AuthProvider')
  }
  return v
}
