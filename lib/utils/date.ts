import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

export function toDate(ts: Timestamp | Date): Date {
  return ts instanceof Date ? ts : ts.toDate()
}

export function relativeTime(ts: Timestamp | Date): string {
  return formatDistanceToNow(toDate(ts), { addSuffix: true })
}

export function conversationTimestamp(ts: Timestamp | Date): string {
  const d = toDate(ts)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd/MM/yyyy')
}
