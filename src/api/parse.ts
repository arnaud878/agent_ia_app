/** Parse JSON côté client avec messages d'erreur HTTP unifiés. */
export async function parseJson<T>(res: Response): Promise<T> {
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
        msg = text.slice(0, 500)
      }
    }
    throw new Error(msg)
  }
  return (text ? JSON.parse(text) : {}) as T
}
