/**
 * Récupère les graphiques Chart.js (canvas) rendus dans l’iframe assistant,
 * pour les intégrer au PDF. Même origine (srcdoc + sandbox allow-same-origin).
 */
export function collectAssistantChartDataUrls(messageId: string): string[] {
  const safeId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(messageId)
      : messageId.replace(/"/g, '\\"')
  const iframe = document.querySelector<HTMLIFrameElement>(
    `iframe[data-ia-assistant-frame="${safeId}"]`,
  )
  const doc = iframe?.contentDocument
  if (!doc) {
    return []
  }
  const canvases = [...doc.querySelectorAll('canvas')]
  return canvases.map((canvas) => {
    try {
      return canvas.toDataURL('image/png')
    } catch {
      return ''
    }
  })
}

/**
 * Laisse un court délai pour que Chart.js termine le rendu avant capture.
 */
export function waitForChartsBeforePdfCapture(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 200)
      })
    })
  })
}
