import type { AppTheme } from '@/theme/ThemeContext'

/**
 * Couleurs pour l’export PDF (alignées sur index.css + zone embed AssistantHtmlFrame).
 */
export type PdfThemeTokens = {
  pageBg: string
  pageText: string
  headingText: string
  border: string
  accent: string
  userBubbleBg: string
  userBubbleText: string
  assistantBubbleBg: string
  assistantBubbleText: string
  assistantContentBg: string
  assistantContentText: string
  codeBg: string
  metaText: string
}

export function getPdfThemeTokens(theme: AppTheme): PdfThemeTokens {
  if (theme === 'dark') {
    return {
      pageBg: '#16171d',
      pageText: '#9ca3af',
      headingText: '#f3f4f6',
      border: '#2e303a',
      accent: '#c084fc',
      userBubbleBg: '#1a1b22',
      userBubbleText: '#f3f4f6',
      assistantBubbleBg: '#1a1b22',
      assistantBubbleText: '#e5e7eb',
      assistantContentBg: '#0f1117',
      assistantContentText: '#f3f4f6',
      codeBg: '#1f2028',
      metaText: '#9ca3af',
    }
  }
  return {
    pageBg: '#ffffff',
    pageText: '#6b6375',
    headingText: '#08060d',
    border: '#e5e4e7',
    accent: '#aa3bff',
    userBubbleBg: '#fafaf8',
    userBubbleText: '#08060d',
    assistantBubbleBg: '#fafaf8',
    assistantBubbleText: '#111827',
    assistantContentBg: '#ffffff',
    assistantContentText: '#111827',
    codeBg: '#f4f3ec',
    metaText: '#6b6375',
  }
}
