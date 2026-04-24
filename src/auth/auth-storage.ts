import type { UserSession } from './types'

const TOKEN_KEY = 'ia_auth_token'
const USER_KEY = 'ia_auth_user'

export function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function readStoredUser(): UserSession | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as UserSession
  } catch {
    return null
  }
}

export function writeAuth(token: string, user: UserSession) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
