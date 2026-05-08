/**
 * Chemins d’API alignés sur ia_back (Nest).
 * Un seul endroit à mettre à jour si une route back change.
 */

/** Base `VITE_API_BASE` (sans / final) + chemin. */
export function apiUrl(baseUrl: string, path: string): string {
  const b = baseUrl.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

export const AuthPaths = {
  config: '/auth/config',
  login: '/auth/login',
  register: '/auth/register',
  me: '/auth/me',
} as const

export const IamPaths = {
  biTables: '/iam/bi-tables',
  biConnection: '/iam/bi-connection',
  roles: '/iam/roles',
  users: '/iam/users',
  roleTables: (roleId: string) => `/iam/roles/${roleId}/tables` as const,
  user: (userId: string) => `/iam/users/${userId}` as const,
  conversations: '/iam/conversations',
  conversation: (id: string) => `/iam/conversations/${id}` as const,
  conversationMessages: (id: string) => `/iam/conversations/${id}/messages` as const,
  adminTurns: '/iam/admin/turns' as const,
  adminConversations: '/iam/admin/conversations' as const,
  adminMessages: '/iam/admin/messages' as const,
  adminConversation: (id: string) => `/iam/admin/conversations/${id}` as const,
  adminConversationMessages: (id: string) => `/iam/admin/conversations/${id}/messages` as const,
} as const

/**
 * POST NDJSON du chat BI : `/webhook/{segment}/{streamSuffix}` (streamSuffix = `stream` par défaut).
 */
export function getBiWebhookStreamPath(
  n8nPathSegment: string,
  streamSuffix: string = 'stream',
): string {
  return `/webhook/${n8nPathSegment}/${streamSuffix}`
}
