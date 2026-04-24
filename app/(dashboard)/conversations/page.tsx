import { ConversationList } from '@/components/conversations/ConversationList'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export default function ConversationsPage() {
  return (
    <ErrorBoundary>
      <div className="h-full overflow-hidden">
        <ConversationList />
      </div>
    </ErrorBoundary>
  )
}
