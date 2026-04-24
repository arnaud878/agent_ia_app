import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  html: string
}

/**
 * L’API renvoie du HTML souvent accompagné de Chart.js (&lt;canvas&gt; + &lt;script&gt;).
 * Avec `dangerouslySetInnerHTML`, les &lt;script&gt; ne s’exécutent pas : les graphiques ne s’affichent pas.
 * Un iframe + srcdoc permet d’exécuter les scripts (contenu signé côté back / confiance).
 */
export function AssistantHtmlFrame({ html }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [heightPx, setHeightPx] = useState(160)

  const fitHeight = useCallback(() => {
    const el = iframeRef.current
    const body = el?.contentDocument?.body
    if (!body) {
      return
    }
    const doc = el!.contentDocument!
    const h = Math.max(
      body.scrollHeight,
      doc.documentElement?.scrollHeight ?? 0,
    )
    if (Number.isFinite(h) && h > 0) {
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800
      /* Évite un iframe plus haut que l’écran : scroll à l’intérieur de l’iframe */
      const cap = Math.min(3600, Math.max(160, vh * 0.88))
      setHeightPx(Math.min(h + 24, cap))
    }
  }, [])

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
  }, [html, fitHeight])

  const isFullDocument =
    /^\s*<!DOCTYPE/i.test(html) || /^\s*<html[\s>]/i.test(html)

  const srcDoc = isFullDocument
    ? html
    : `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" rel="noopener noreferrer" />
  <style>
    html, body { margin: 0; padding: 0; background: transparent; height: 100%; }
    body { box-sizing: border-box; padding: 0.25rem 0.15rem; overflow: auto; }
  </style>
</head>
<body>${html}</body>
</html>`

  return (
    <iframe
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
        background: 'transparent',
      }}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  )
}
