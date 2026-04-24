const MAX_MESSAGE_LENGTH = 4096

/**
 * Sanitize an inbound message body before storing to Firestore.
 * - Trims whitespace
 * - Strips null bytes (break Firestore queries)
 * - Truncates to 4096 chars (WhatsApp message limit)
 * - Preserves emoji and non-ASCII characters
 */
export function sanitizeMessageBody(body: string): string {
  return body
    .replace(/\0/g, '')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)
}
