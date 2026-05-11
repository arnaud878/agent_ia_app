import { useMemo } from 'react'
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatDurationMs } from '@/lib/format-duration'
import {
  attachChartDataUrls,
  parseAssistantHtmlToBlocks,
  type PdfAssistantBlock,
} from '@/lib/pdf/parse-assistant-html'
import type { PdfThemeTokens } from '@/theme/pdf-theme'
import { getPdfThemeTokens } from '@/theme/pdf-theme'
import type { AppTheme } from '@/theme/ThemeContext'
import type { ChatMessage } from '@/types/chat'

export type ChatPdfLabels = {
  headerTitle: string
  metaDisplayKey: string
  metaExportedAt: string
  roleUser: string
  roleAssistant: string
}

function buildStyles(c: PdfThemeTokens) {
  return StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: 'Helvetica',
      fontSize: 10,
      lineHeight: 1.45,
      backgroundColor: c.pageBg,
      color: c.pageText,
    },
    headerTitle: {
      fontSize: 16,
      color: c.headingText,
      marginBottom: 6,
    },
    headerMeta: {
      fontSize: 8,
      color: c.metaText,
      marginBottom: 16,
    },
    bubbleWrap: {
      marginBottom: 12,
    },
    bubble: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
      padding: 10,
    },
    userBubble: {
      backgroundColor: c.userBubbleBg,
    },
    assistantBubble: {
      backgroundColor: c.assistantBubbleBg,
    },
    bubbleLabel: {
      fontSize: 8,
      color: c.accent,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    userText: {
      color: c.userBubbleText,
      fontSize: 10,
    },
    assistantInner: {
      backgroundColor: c.assistantContentBg,
      padding: 8,
      borderRadius: 2,
    },
    paragraph: {
      color: c.assistantContentText,
      marginBottom: 6,
    },
    heading: {
      color: c.headingText,
      fontWeight: 'bold',
      marginTop: 4,
      marginBottom: 4,
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    bulletMark: {
      width: 14,
      color: c.assistantContentText,
    },
    bulletText: {
      flex: 1,
      color: c.assistantContentText,
    },
    code: {
      fontFamily: 'Courier',
      fontSize: 8,
      color: c.assistantContentText,
      backgroundColor: c.codeBg,
      padding: 6,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 2,
    },
    hr: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 6,
    },
    table: {
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 8,
      borderRadius: 2,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tableRowLast: {
      flexDirection: 'row',
      borderBottomWidth: 0,
    },
    tableCell: {
      flex: 1,
      padding: 4,
      minWidth: 36,
      borderRightWidth: 1,
      borderRightColor: c.border,
    },
    tableCellLast: {
      flex: 1,
      padding: 4,
      minWidth: 36,
      borderRightWidth: 0,
    },
    tableCellText: {
      fontSize: 7,
      color: c.assistantContentText,
    },
    timing: {
      marginTop: 6,
      fontSize: 7,
      color: c.metaText,
    },
    chartWrap: {
      marginBottom: 8,
      alignItems: 'center',
    },
    chartImg: {
      width: '100%',
      maxHeight: 200,
      objectFit: 'contain',
    },
  })
}

function headingFontSize(level: 1 | 2 | 3 | 4 | 5 | 6): number {
  const m: Record<number, number> = { 1: 13, 2: 12, 3: 11, 4: 10, 5: 10, 6: 10 }
  return m[level] ?? 10
}

function BlockView({
  block,
  styles: s,
}: {
  block: PdfAssistantBlock
  styles: ReturnType<typeof buildStyles>
}) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <Text style={s.paragraph} wrap>
          {block.text}
        </Text>
      )
    case 'heading':
      return (
        <Text
          style={[s.heading, { fontSize: headingFontSize(block.level) }]}
          wrap
        >
          {block.text}
        </Text>
      )
    case 'bullet':
      return (
        <View style={s.bulletRow}>
          <Text style={s.bulletMark}>
            {block.ordered ? `${block.index}.` : '•'}
          </Text>
          <Text style={s.bulletText} wrap>
            {block.text}
          </Text>
        </View>
      )
    case 'code':
      return (
        <Text style={s.code} wrap>
          {block.text}
        </Text>
      )
    case 'hr':
      return <View style={s.hr} />
    case 'table':
      return (
        <View style={s.table}>
          {block.rows.map((row, ri) => (
            <View
              key={`r-${ri}`}
              style={ri < block.rows.length - 1 ? s.tableRow : s.tableRowLast}
            >
              {row.map((cell, ci) => (
                <View
                  key={`c-${ri}-${ci}`}
                  style={
                    ci < row.length - 1 ? s.tableCell : s.tableCellLast
                  }
                >
                  <Text style={s.tableCellText} wrap>
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )
    case 'chart':
      if (!block.dataUrl) {
        return null
      }
      return (
        <View style={s.chartWrap} wrap={false}>
          <Image src={block.dataUrl} style={s.chartImg} />
        </View>
      )
    default:
      return null
  }
}

function AssistantContent({
  html,
  textFallback,
  chartDataUrls,
  styles: s,
}: {
  html?: string
  textFallback?: string
  chartDataUrls?: readonly string[]
  styles: ReturnType<typeof buildStyles>
}) {
  const blocks = useMemo(() => {
    let base: PdfAssistantBlock[]
    if (html && html.trim()) {
      base = parseAssistantHtmlToBlocks(html)
    } else if (textFallback && textFallback.trim()) {
      base = [{ kind: 'paragraph' as const, text: textFallback.trim() }]
    } else {
      base = []
    }
    return attachChartDataUrls(base, chartDataUrls)
  }, [html, textFallback, chartDataUrls])

  if (blocks.length === 0) {
    return (
      <Text style={s.paragraph} wrap>
        —
      </Text>
    )
  }

  return (
    <View style={s.assistantInner}>
      {blocks.map((b, i) => (
        <BlockView key={`${b.kind}-${i}`} block={b} styles={s} />
      ))}
    </View>
  )
}

export type ChatPdfDocumentProps = {
  theme: AppTheme
  messages: ChatMessage[]
  /** PNG (data URL) des canvas par id de message assistant */
  chartDataUrlsByMessageId?: Readonly<Record<string, readonly string[]>>
  labels: ChatPdfLabels
}

export function ChatPdfDocument({
  theme,
  messages,
  chartDataUrlsByMessageId,
  labels,
}: ChatPdfDocumentProps) {
  const tokens = getPdfThemeTokens(theme)
  const styles = useMemo(() => buildStyles(tokens), [tokens])

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.headerTitle}>{labels.headerTitle}</Text>
        <Text style={styles.headerMeta}>
          {labels.metaDisplayKey}
          {'\n'}
          {labels.metaExportedAt}
        </Text>

        {messages.map((msg) => (
          <View key={msg.id} style={styles.bubbleWrap} wrap>
            <View
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
              wrap
            >
              <Text style={styles.bubbleLabel}>
                {msg.role === 'user'
                  ? labels.roleUser
                  : labels.roleAssistant}
              </Text>
              {msg.role === 'user' && msg.text && (
                <Text style={styles.userText} wrap>
                  {msg.text}
                </Text>
              )}
              {msg.role === 'assistant' && (
                <AssistantContent
                  html={msg.html}
                  textFallback={msg.text}
                  chartDataUrls={chartDataUrlsByMessageId?.[msg.id]}
                  styles={styles}
                />
              )}
              {msg.durationMs != null && (
                <Text style={styles.timing}>
                  {formatDurationMs(msg.durationMs)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  )
}
