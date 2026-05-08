import type { LoginResponse, RoleRow, UserRow } from '@/auth/types'
import { parseJson } from '@/api/parse'
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

export async function apiSetBiTables(
  baseUrl: string,
  token: string,
  tableNames: string[],
): Promise<string[]> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.biTables), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ tableNames }),
  })
  const j = await parseJson<{ tables: string[] }>(res)
  return j.tables
}

export async function apiGetBiConnection(
  baseUrl: string,
  token: string,
): Promise<{ connectionString: string }> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.biConnection), {
    headers: authHeaders(token),
  })
  return parseJson<{ connectionString: string }>(res)
}

export async function apiSetBiConnection(
  baseUrl: string,
  token: string,
  connectionString: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.biConnection), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ connectionString }),
  })
  return parseJson<{ ok: boolean }>(res)
}

export type LlmProvider = 'gemini' | 'gpt' | 'claude'

export async function apiGetLlmSettings(
  baseUrl: string,
  token: string,
): Promise<{ provider: LlmProvider; model: string; hasApiKey: boolean }> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.llmSettings), {
    headers: authHeaders(token),
  })
  return parseJson<{ provider: LlmProvider; model: string; hasApiKey: boolean }>(res)
}

export async function apiSetLlmSettings(
  baseUrl: string,
  token: string,
  body: { provider: LlmProvider; model: string; apiKey?: string },
): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.llmSettings), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseJson<{ ok: boolean }>(res)
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

export type TurnRow = {
  userMsgId: string
  userText: string | null
  userCreatedAt: string
  aiMsgId: string | null
  aiText: string | null
  aiHtml: string | null
  durationMs: number | null
  requeteSQL: string | null
  resultatSQL: string | null
  aiCreatedAt: string | null
  conversationId: string
  displayKey: string
  title: string | null
  userEmail: string
}

export async function apiAdminListTurns(
  baseUrl: string,
  token: string,
  params: { page?: number; limit?: number; search?: string } = {},
): Promise<PaginatedResult<TurnRow>> {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))
  if (params.search) q.set('search', params.search)
  const query = q.toString()
  const url = apiUrl(baseUrl, IamPaths.adminTurns) + (query ? `?${query}` : '')
  const res = await fetch(url, { headers: authHeaders(token) })
  return parseJson<PaginatedResult<TurnRow>>(res)
}

export type AdminConversationRow = {
  id: string
  displayKey: string
  title: string | null
  createdAt: string
  updatedAt: string
  userEmail: string
  userId: string
  messageCount: number
}

export type PaginatedResult<T> = {
  rows: T[]
  total: number
  page: number
  limit: number
}

export type AdminMessageRow = {
  id: string
  role: 'user' | 'assistant'
  text: string | null
  html: string | null
  durationMs: number | null
  requeteSQL: string | null
  resultatSQL: string | null
  createdAt: string
  conversationId: string
  displayKey: string
  userEmail: string
}

export async function apiAdminListConversations(
  baseUrl: string,
  token: string,
  params: { page?: number; limit?: number; search?: string; userId?: string } = {},
): Promise<PaginatedResult<AdminConversationRow>> {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))
  if (params.search) q.set('search', params.search)
  if (params.userId) q.set('userId', params.userId)
  const query = q.toString()
  const url = apiUrl(baseUrl, IamPaths.adminConversations) + (query ? `?${query}` : '')
  const res = await fetch(url, { headers: authHeaders(token) })
  return parseJson<PaginatedResult<AdminConversationRow>>(res)
}

export async function apiAdminGetConversationMessages(
  baseUrl: string,
  token: string,
  conversationId: string,
): Promise<AdminMessageRow[]> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.adminConversationMessages(conversationId)),
    { headers: authHeaders(token) },
  )
  return parseJson<AdminMessageRow[]>(res)
}

export async function apiAdminListMessages(
  baseUrl: string,
  token: string,
  params: { page?: number; limit?: number; search?: string; role?: string } = {},
): Promise<PaginatedResult<AdminMessageRow>> {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))
  if (params.search) q.set('search', params.search)
  if (params.role) q.set('role', params.role)
  const query = q.toString()
  const url = apiUrl(baseUrl, IamPaths.adminMessages) + (query ? `?${query}` : '')
  const res = await fetch(url, { headers: authHeaders(token) })
  return parseJson<PaginatedResult<AdminMessageRow>>(res)
}

export async function apiAdminDeleteConversation(
  baseUrl: string,
  token: string,
  conversationId: string,
): Promise<void> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.adminConversation(conversationId)),
    { method: 'DELETE', headers: authHeaders(token) },
  )
  if (!res.ok) {
    const text = await res.text()
    let msg = `HTTP ${res.status}`
    try {
      const j = text ? (JSON.parse(text) as { message?: string | string[] }) : null
      if (j?.message) {
        msg = Array.isArray(j.message) ? (j.message[0] ?? msg) : j.message
      }
    } catch {
      if (text) msg = text.slice(0, 300)
    }
    throw new Error(msg)
  }
}
