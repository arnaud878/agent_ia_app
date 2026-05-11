import { apiUrl, IamPaths } from '@/config/api-routes'
import { parseJson } from '@/api/parse'

export type ConversationRow = {
  id: string
  /** Clé courte affichée (header, liste) */
  displayKey: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export type UiMessageRow = {
  id: string
  role: 'user' | 'assistant'
  text: string | null
  html: string | null
  durationMs: number | null
  createdAt: string
}

export type ConversationAttachmentRow = {
  id: string
  conversationId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function apiListConversations(
  baseUrl: string,
  token: string,
): Promise<ConversationRow[]> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.conversations), {
    headers: authHeaders(token),
  })
  return parseJson<ConversationRow[]>(res)
}

export async function apiPostConversation(
  baseUrl: string,
  token: string,
  body: { id?: string; title?: string | null },
): Promise<ConversationRow> {
  const res = await fetch(apiUrl(baseUrl, IamPaths.conversations), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseJson<ConversationRow>(res)
}

export async function apiGetConversationMessages(
  baseUrl: string,
  token: string,
  conversationId: string,
): Promise<UiMessageRow[]> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.conversationMessages(conversationId)),
    { headers: authHeaders(token) },
  )
  const data = await parseJson<{ messages: UiMessageRow[] }>(res)
  return data.messages
}

export type AppendUiMessageBody = {
  role: 'user' | 'assistant'
  text?: string | null
  html?: string | null
  durationMs?: number | null
  requeteSQL?: string | null
  resultatSQL?: string | null
}

export async function apiPostConversationMessage(
  baseUrl: string,
  token: string,
  conversationId: string,
  body: AppendUiMessageBody,
): Promise<{ id: string }> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.conversationMessages(conversationId)),
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  )
  return parseJson<{ id: string }>(res)
}

export async function apiPatchConversation(
  baseUrl: string,
  token: string,
  conversationId: string,
  body: { title?: string | null },
): Promise<ConversationRow> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.conversation(conversationId)),
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  )
  return parseJson<ConversationRow>(res)
}

export async function apiDeleteConversation(
  baseUrl: string,
  token: string,
  conversationId: string,
): Promise<void> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.conversation(conversationId)),
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
      if (text) {
        msg = text.slice(0, 300)
      }
    }
    throw new Error(msg)
  }
}

export async function apiListConversationAttachments(
  baseUrl: string,
  token: string,
  conversationId: string,
): Promise<ConversationAttachmentRow[]> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.conversationAttachments(conversationId)),
    { headers: authHeaders(token) },
  )
  return parseJson<ConversationAttachmentRow[]>(res)
}

export async function apiUploadConversationAttachment(
  baseUrl: string,
  token: string,
  conversationId: string,
  file: File,
): Promise<ConversationAttachmentRow> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.conversationAttachments(conversationId)),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    },
  )
  return parseJson<ConversationAttachmentRow>(res)
}

export async function apiDeleteConversationAttachment(
  baseUrl: string,
  token: string,
  conversationId: string,
  attachmentId: string,
): Promise<void> {
  const res = await fetch(
    apiUrl(baseUrl, IamPaths.conversationAttachment(conversationId, attachmentId)),
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`)
  }
}
