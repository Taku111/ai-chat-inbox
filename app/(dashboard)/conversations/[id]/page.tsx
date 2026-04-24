import { ChatWindow } from '@/components/chat/ChatWindow'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  return (
    <ErrorBoundary>
      <ChatWindow conversationId={id} />
    </ErrorBoundary>
  )
}
