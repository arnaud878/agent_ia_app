import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppTheme } from '@/theme/ThemeContext'

const EMBED: Record<
  AppTheme,
  { bg: string; text: string; scheme: 'light' | 'dark' }
> = {
  light: { bg: '#ffffff', text: '#111827', scheme: 'light' },
  dark: { bg: '#0f1117', text: '#f3f4f6', scheme: 'dark' },
}

type Props = {
  /** Id du message (pour recharger l’iframe quand le thème change) */
  messageId: string
  html: string
  colorScheme: AppTheme
}

/**
 * Surcharge les styles inline typiques des réponses (mode sombre figé) sans toucher au vert
 * d’accent (#4caf50, bordures, barres de graphique).
 */
function buildThemedResponseStylesheet(
  colorScheme: AppTheme,
  embed: (typeof EMBED)[AppTheme],
): string {
  if (colorScheme === 'light') {
    return `<style data-ia-embed="light">
  html.ia-embed--light, html.ia-embed--light body {
    background: ${embed.bg} !important;
    color: ${embed.text} !important;
    color-scheme: light;
  }
  /* Cartes / conteneurs sombres (modèle) */
  html.ia-embed--light [style*="#121212"], html.ia-embed--light [style*="background-color: #121212"] {
    background-color: #f9fafb !important;
    color: #1f2937 !important;
  }
  html.ia-embed--light [style*="#1e1e1e"] {
    background-color: #f3f4f6 !important;
    color: #1f2937 !important;
  }
  /* blocs #1a1a1a, gris bord, texte clair (recommandations, encarts) */
  html.ia-embed--light [style*="#1a1a1a"] {
    background: #f3f4f6 !important;
    background-color: #f3f4f6 !important;
    border: 1px dashed #94a3b8 !important;
    color: #1f2937 !important;
  }
  html.ia-embed--light [style*="#181818"],
  html.ia-embed--light [style*="#202020"],
  html.ia-embed--light [style*="#2a2a2a"] {
    background: #f3f4f6 !important;
    background-color: #f3f4f6 !important;
    color: #1f2937 !important;
  }
  /* #222 seul (éviter de matcher #2222…) : contexte "background" */
  html.ia-embed--light [style*="background: #222"],
  html.ia-embed--light [style*="background:#222"] {
    background: #f3f4f6 !important;
    color: #1f2937 !important;
  }
  html.ia-embed--light ul[style*="#ccc"],
  html.ia-embed--light ol[style*="#ccc"] {
    color: #4b5563 !important;
  }
  html.ia-embed--light [style*="#111827"] {
    background-color: #f9fafb !important;
    color: #111827 !important;
  }
  html.ia-embed--light p[style*="#b0b0b0"],
  html.ia-embed--light li[style*="#b0b0b0"] {
    color: #4b5563 !important;
  }
  html.ia-embed--light h2[style*="#fff"], html.ia-embed--light h2[style*="#ffffff"] {
    color: #111827 !important;
  }
  html.ia-embed--light th[style*="#333"], html.ia-embed--light thead tr[style*="#333"] {
    background-color: #e5e7eb !important;
    color: #111827 !important;
  }
  html.ia-embed--light table[style*="#1e1e1e"] {
    background-color: #f9fafb !important;
    color: #1f2937 !important;
  }
  html.ia-embed--light [style*="#e0e0e0"] { color: #374151 !important; }
  html.ia-embed--light [style*="#888"] { color: #6b7280 !important; }
  html.ia-embed--light [style*="#e0e0e0; border"] { border-color: #d1d5db !important; color: #4b5563 !important; }
  /* #bbb, #aaa, #999, rgb gris : peu contrastés sur blanc / gris clair */
  html.ia-embed--light [style*="color: #bbb"], html.ia-embed--light [style*="color:#bbb"],
  html.ia-embed--light [style*="#bbb"] {
    color: #374151 !important;
  }
  html.ia-embed--light [style*="color: #aaa"], html.ia-embed--light [style*="color:#aaa"] {
    color: #4b5563 !important;
  }
  html.ia-embed--light [style*="color: #999"], html.ia-embed--light [style*="color:#999"] {
    color: #4b5563 !important;
  }
  html.ia-embed--light [style*="187, 187, 187"], html.ia-embed--light [style*="#bebebe"] {
    color: #374151 !important;
  }
</style>`
  }
  return `<style data-ia-embed="dark">
  html.ia-embed--dark, html.ia-embed--dark body {
    background: ${embed.bg} !important;
    color: ${embed.text} !important;
    color-scheme: dark;
  }
  /* Si le modèle a mis du “clair” partout, rétablir un canvas lisible en sombre */
  html.ia-embed--dark [style*="#f9fafb"] { color: #e5e7eb !important; }
</style>`
}

/** UMD (global Chart) : doit être exécuté avant tout &lt;script&gt; inline qui appelle new Chart(). */
const CHART_UMD_SRC =
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'

const USES_CHART_IN_HTML =
  /new\s+Chart\s*\(|\bChart\.defaults|\.getContext\s*\(\s*["']2d["']/i

function hasChartCdnInHeadStart(doc: string): boolean {
  const headOpen = doc.match(/<head[^>]*>/i)
  if (!headOpen) {
    return false
  }
  const i = (headOpen.index ?? 0) + headOpen[0].length
  const afterHead = doc.slice(i, i + 6_000)
  return /<script[^>]+src=[^>]*chart(\.umd|\.min|\.js|@)/i.test(afterHead)
}

/**
 * Beaucoup de réponses n8n placent l’appel new Chart() avant (ou sans) le script CDN.
 */
function injectChartUmdAsFirstInHead(doc: string): string {
  if (!USES_CHART_IN_HTML.test(doc)) {
    return doc
  }
  if (hasChartCdnInHeadStart(doc)) {
    return doc
  }
  if (!/<head[^>]*>/i.test(doc)) {
    return doc
  }
  const tag = `<script src="${CHART_UMD_SRC}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`
  return doc.replace(/<head[^>]*>/i, (h) => `${h}
${tag}`)
}

/** Ajoute les classes de thème sur &lt;html&gt; pour que les règles ciblent le document. */
function addHtmlRootClass(raw: string, colorScheme: AppTheme): string {
  const cl = `ia-embed ia-embed--${colorScheme}`
  if (/<html[^>]+class="/i.test(raw)) {
    return raw.replace(
      /(<html[^>]*\sclass=")([^"]*)(")/i,
      (_a, p1, existing, p3) => {
        const e = String(existing)
        if (/\bia-embed\b/.test(e)) {
          return `${p1}${e.replace(/\bia-embed--\w+/g, `ia-embed--${colorScheme}`).replace(/\s+/g, ' ').trim()}${p3}`
        }
        return `${p1}${cl} ${e.trim()}${p3}`
      },
    )
  }
  if (/<html\s/i.test(raw)) {
    return raw.replace(/<html(\s)/i, `<html class="${cl}"$1`)
  }
  if (/<html>/i.test(raw)) {
    return raw.replace(/<html>/i, `<html class="${cl}">`)
  }
  return raw
}

/**
 * Insère le thème d’embarqué dans un document complet (l’API renvoie souvent &lt;!DOCTYPE html&gt;).
 */
function injectThemeInFullDocument(
  raw: string,
  colorScheme: AppTheme,
  embed: (typeof EMBED)[AppTheme],
): string {
  const doc = injectChartUmdAsFirstInHead(addHtmlRootClass(raw, colorScheme))
  const block = buildThemedResponseStylesheet(colorScheme, embed)
  if (/<\/head\s*>/i.test(doc)) {
    return doc.replace(/<\/head\s*>/i, (m) => `${block}
${m}`)
  }
  if (/<head[^>]*>/i.test(doc)) {
    return doc.replace(/<head[^>]*>/i, (h) => `${h}
${block}`)
  }
  return `${block}
${doc}`
}

/**
 * Tente d’appliquer un thème aux graphiques Chart.js (iframe isolée, scripts API).
 * Ne remplace pas d’objets `ticks`/`grid` (proxys + options _scriptable) : uniquement
 * assignations de couleurs scalaires, sinon Chart.js 4 lève
 * "Recursion detected: _scriptable->_scriptable".
 */
function patchChartJsInFrame(
  win: Window,
  doc: Document,
  isDark: boolean,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Chart = (win as { Chart?: any }).Chart
  if (typeof Chart === 'undefined' || !Chart?.defaults) {
    return
  }
  const textMain = isDark ? '#d1d5db' : '#1f2937'
  const legendC = isDark ? '#d1d5db' : '#374151'
  const border = isDark ? 'rgba(75, 85, 99, 0.55)' : 'rgba(148, 163, 184, 0.6)'
  const tick = isDark ? '#9ca3af' : '#4b5563'
  const grid = isDark ? 'rgba(75, 85, 99, 0.4)' : 'rgba(148, 163, 184, 0.45)'

  Chart.defaults.color = textMain
  Chart.defaults.borderColor = border
  Chart.defaults.backgroundColor = isDark
    ? 'rgba(99, 102, 241, 0.45)'
    : 'rgba(99, 102, 241, 0.35)'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyToChart = (ch: any) => {
    if (!ch || !ch.options) {
      return
    }
    const o = ch.options
    const p = o.plugins
    if (p?.legend?.labels && typeof p.legend.labels === 'object') {
      p.legend.labels.color = legendC
    }
    if (p?.title && typeof p.title === 'object' && p.title !== null) {
      try {
        ;(p.title as { color?: string }).color = textMain
      } catch {
        /* titre avec options internes spécifiques (plugin) */
      }
    }

    const scales = o.scales
    if (!scales || typeof scales !== 'object') {
      return
    }
    for (const k of Object.keys(scales)) {
      const s = (scales as Record<string, { ticks?: { color?: string }; grid?: { color?: string }; title?: { color?: string } }>)[k]
      if (!s) {
        continue
      }
      if (s.ticks && typeof s.ticks === 'object') {
        s.ticks.color = tick
      }
      if (s.grid && typeof s.grid === 'object') {
        s.grid.color = grid
      }
      if (s.title && typeof s.title === 'object') {
        s.title.color = tick
      }
    }
  }

  try {
    doc.querySelectorAll('canvas').forEach((canvas) => {
      const c = typeof Chart.getChart === 'function' ? Chart.getChart(canvas) : null
      if (c) {
        applyToChart(c)
        c.update?.('none')
      }
    })
  } catch {
    /* ignore */
  }
}

/**
 * L’API renvoie du HTML souvent accompagné de Chart.js (&lt;canvas&gt; + &lt;script&gt;).
 * Avec `dangerouslySetInnerHTML`, les &lt;script&gt; ne s’exécutent pas : les graphiques ne s’affichent pas.
 * Un iframe + srcdoc permet d’exécuter les scripts (contenu signé côté back / confiance).
 */
export function AssistantHtmlFrame({ messageId, html, colorScheme }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [heightPx, setHeightPx] = useState(160)
  const embed = EMBED[colorScheme]

  const applyThemedDocumentSurface = useCallback(() => {
    const el = iframeRef.current
    const doc = el?.contentDocument
    if (!doc) {
      return
    }
    doc.documentElement.style.background = embed.bg
    doc.documentElement.style.colorScheme = embed.scheme
    if (doc.body) {
      doc.body.style.background = embed.bg
      doc.body.style.color = embed.text
    }
  }, [embed])

  const fitHeight = useCallback(() => {
    const el = iframeRef.current
    const doc = el?.contentDocument
    const win = el?.contentWindow
    if (doc) {
      applyThemedDocumentSurface()
      if (win) {
        patchChartJsInFrame(win, doc, colorScheme === 'dark')
      }
    }
    const body = doc?.body
    if (!body) {
      return
    }
    const h = Math.max(
      body.scrollHeight,
      doc.documentElement?.scrollHeight ?? 0,
    )
    if (Number.isFinite(h) && h > 0) {
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800
      const cap = Math.min(3600, Math.max(160, vh * 0.88))
      setHeightPx(Math.min(h + 24, cap))
    }
  }, [applyThemedDocumentSurface, colorScheme])

  useEffect(() => {
    const run = () => {
      fitHeight()
    }
    const t1 = window.setTimeout(run, 80)
    const t2 = window.setTimeout(run, 600)
    const t3 = window.setTimeout(run, 2000)
    window.addEventListener('resize', run)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      window.removeEventListener('resize', run)
    }
  }, [html, colorScheme, fitHeight])

  const isFullDocument =
    /^\s*<!DOCTYPE/i.test(html) || /^\s*<html[\s>]/i.test(html)

  const srcDoc = useMemo(() => {
    if (isFullDocument) {
      return injectThemeInFullDocument(html, colorScheme, embed)
    }
    const frag = `<!DOCTYPE html>
<html lang="fr" class="ia-embed ia-embed--${colorScheme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" rel="noopener noreferrer" />
  ${buildThemedResponseStylesheet(colorScheme, embed)}
  <style>
    html, body { margin: 0; padding: 0; min-height: 100%; }
    body { box-sizing: border-box; padding: 0.25rem 0.15rem; overflow: auto; }
  </style>
</head>
<body>${html}</body>
</html>`
    return injectChartUmdAsFirstInHead(frag)
  }, [html, isFullDocument, colorScheme, embed])

  return (
    <iframe
      key={`${messageId}-${colorScheme}`}
      ref={iframeRef}
      className="bubble-html-iframe"
      title="Réponse affichage riche (HTML / graphiques)"
      srcDoc={srcDoc}
      onLoad={fitHeight}
      style={{
        width: '100%',
        minHeight: 80,
        height: heightPx,
        border: 0,
        display: 'block',
        background: embed.bg,
        colorScheme: embed.scheme,
      }}
      data-chat-theme={colorScheme}
      data-ia-assistant-frame={messageId}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  )
}
