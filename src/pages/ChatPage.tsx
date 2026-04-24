import { ChatView } from '@/components/chat/ChatView'
import { useBiChat } from '@/hooks/use-bi-chat'
import '../styles/chat-app.css'

export function ChatPage() {
  const chat = useBiChat()
  return <ChatView {...chat} />
}
