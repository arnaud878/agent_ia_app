import type { LoginResponse, RoleRow, UserRow } from '@/auth/types'
import { apiUrl, AuthPaths, IamPaths } from '@/config/api-routes'

export type AuthPublicConfig = {
  publicRegister: boolean
  webhookJwtOnly: boolean
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = text ? (JSON.parse(text) as { message?: string | string[] }) : null
      if (j?.message) {
        msg = Array.isArray(j.message) ? (j.message[0] ?? msg) : j.message
      }
    } catch {
      if (text) {
        msg = text.slice(0, 300)
      }
    }
    throw new Error(msg)
  }
  return (text ? JSON.parse(text) : {}) as T
}

export async function apiAuthConfig(baseUrl: string): Promise<AuthPublicConfig> {
  const res = await fetch(apiUrl(baseUrl, AuthPaths.config), {
    headers: { Accept: 'application/json' },
  })
  return parseJson<AuthPublicConfig>(res)
}

export async function apiLogin(
  baseUrl: string,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(apiUrl(baseUrl, AuthPaths.login), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseJson<LoginResponse>(res)
}

export async function apiRegister(
  baseUrl: string,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(apiUrl(baseUrl, AuthPaths.register), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseJson<LoginResponse>(res)
}

export async function apiMe(
  baseUrl: string,
  token: string,
): Promise<{ id: string; email: string; roleSlug: string }> {
  const res = await fetch(apiUrl(baseUrl, AuthPaths.me), {
    headers: authHeaders(token),
  })
  return parseJson(res)
}

export async function apiListBiTables(
  baseUrl: string,
  token: string,
): Promise<string[]> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.biTables), {
    headers: authHeaders(token),
  })
  const j = await parseJson<{ tables: string[] }>(res)
  return j.tables
}

export async function apiListRoles(
  baseUrl: string,
  token: string,
): Promise<RoleRow[]> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.roles), {
    headers: authHeaders(token),
  })
  return parseJson<RoleRow[]>(res)
}

export async function apiListUsers(
  baseUrl: string,
  token: string,
): Promise<UserRow[]> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.users), {
    headers: authHeaders(token),
  })
  return parseJson<UserRow[]>(res)
}

export async function apiCreateUser(
  baseUrl: string,
  token: string,
  body: { email: string; password: string; roleId: string },
): Promise<{ id: string }> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.users), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseJson(res)
}

export async function apiUpdateUser(
  baseUrl: string,
  token: string,
  userId: string,
  body: { roleId?: string; active?: boolean; password?: string },
): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.user(userId)), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseJson(res)
}

export async function apiCreateRole(
  baseUrl: string,
  token: string,
  body: {
    name: string
    slug: string
    accessAllTables: boolean
    description?: string
  },
) {
  const res = await fetch(apiUrl(baseUrl, IamPaths.roles), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseJson(res)
}

export async function apiSetRoleTables(
  baseUrl: string,
  token: string,
  roleId: string,
  tableNames: string[],
) {
  const res = await fetch(apiUrl(baseUrl, IamPaths.roleTables(roleId)), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ tableNames }),
  })
  return parseJson<{ ok: boolean }>(res)
}
