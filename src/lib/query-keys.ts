/**
 * Clés stables pour TanStack Query (éviter fautes de frappe).
 */
export const qkConversations = (baseUrl: string, token: string | null) =>
  ['conversations', baseUrl.replace(/\/$/, ''), token ?? ''] as const
