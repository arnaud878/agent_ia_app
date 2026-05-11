const BLOCK_SKIP = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'TEMPLATE',
])

export type PdfAssistantBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: 'bullet'; text: string; ordered: boolean; index: number }
  | { kind: 'code'; text: string }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'hr' }
  /** Rempli au moment de l’export avec une capture PNG du canvas (Chart.js). */
  | { kind: 'chart'; dataUrl?: string }

function normalizeWs(s: string): string {
  return s.replace(/[\s\u00a0]+/g, ' ').trim()
}

function blockText(el: Element): string {
  return normalizeWs(el.textContent ?? '')
}

function extractTable(table: Element): PdfAssistantBlock[] {
  const rows: string[][] = []
  for (const tr of table.querySelectorAll('tr')) {
    const cells = [...tr.querySelectorAll('th,td')].map((c) =>
      normalizeWs(c.textContent ?? ''),
    )
    if (cells.length > 0) {
      rows.push(cells)
    }
  }
  if (rows.length === 0) {
    return []
  }
  return [{ kind: 'table', rows }]
}

function extractList(list: Element, ordered: boolean): PdfAssistantBlock[] {
  const out: PdfAssistantBlock[] = []
  let i = 1
  for (const li of list.children) {
    if (li.tagName.toUpperCase() !== 'LI') {
      continue
    }
    const text = blockText(li as Element)
    if (text) {
      out.push({
        kind: 'bullet',
        text,
        ordered,
        index: ordered ? i++ : 0,
      })
    } else {
      out.push(...walkContainer(li as Element))
    }
  }
  return out
}

function walkContainer(el: Element): PdfAssistantBlock[] {
  const out: PdfAssistantBlock[] = []
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? ''
      const t = normalizeWs(raw)
      if (t) {
        out.push({ kind: 'paragraph', text: t })
      }
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue
    }
    const e = node as Element
    const tag = e.tagName.toUpperCase()
    if (BLOCK_SKIP.has(tag)) {
      continue
    }
    if (tag === 'CANVAS') {
      out.push({ kind: 'chart' })
      continue
    }
    if (tag === 'TABLE') {
      out.push(...extractTable(e))
      continue
    }
    if (tag === 'UL') {
      out.push(...extractList(e, false))
      continue
    }
    if (tag === 'OL') {
      out.push(...extractList(e, true))
      continue
    }
    if (tag === 'HR') {
      out.push({ kind: 'hr' })
      continue
    }
    if (/^H[1-6]$/.test(tag)) {
      const level = Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6
      const text = blockText(e)
      if (text) {
        out.push({ kind: 'heading', level, text })
      }
      continue
    }
    if (tag === 'PRE') {
      const text = (e.textContent ?? '').replace(/\n+$/, '')
      const trimmed = text.trim()
      if (trimmed) {
        out.push({ kind: 'code', text })
      }
      continue
    }
    if (tag === 'P' || tag === 'BLOCKQUOTE') {
      const text = blockText(e)
      if (text) {
        out.push({ kind: 'paragraph', text })
      }
      continue
    }
    if (
      tag === 'DIV' ||
      tag === 'SECTION' ||
      tag === 'ARTICLE' ||
      tag === 'MAIN' ||
      tag === 'BODY' ||
      tag === 'SPAN' ||
      tag === 'CENTER' ||
      tag === 'HEADER' ||
      tag === 'FOOTER'
    ) {
      out.push(...walkContainer(e))
      continue
    }
    if (tag === 'BR') {
      continue
    }
    if (tag === 'LI') {
      const text = blockText(e)
      if (text) {
        out.push({ kind: 'bullet', text, ordered: false, index: 0 })
      }
      continue
    }
    if (e.children.length > 0) {
      out.push(...walkContainer(e))
    } else {
      const text = blockText(e)
      if (text) {
        out.push({ kind: 'paragraph', text })
      }
    }
  }
  return out
}

/**
 * Convertit le HTML assistant en blocs structurés pour react-pdf (texte sélectionnable, pas de script).
 */
export function parseAssistantHtmlToBlocks(html: string): PdfAssistantBlock[] {
  const wrapped = `<div data-ia-pdf-root="1">${html}</div>`
  const doc = new DOMParser().parseFromString(wrapped, 'text/html')
  const root = doc.querySelector('[data-ia-pdf-root="1"]')
  if (!root) {
    return []
  }
  return walkContainer(root)
}

/** Associe chaque bloc `chart` aux data URL capturées dans l’ordre du DOM. */
export function attachChartDataUrls(
  blocks: PdfAssistantBlock[],
  dataUrls: readonly string[] | undefined,
): PdfAssistantBlock[] {
  if (!dataUrls?.length) {
    return blocks
  }
  let i = 0
  return blocks.map((b) => {
    if (b.kind !== 'chart') {
      return b
    }
    const dataUrl = dataUrls[i++]?.trim()
    if (!dataUrl) {
      return b
    }
    return { kind: 'chart' as const, dataUrl }
  })
}
