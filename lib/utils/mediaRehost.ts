import { adminStorage } from '@/lib/firebase/admin'
import { logger } from '@/lib/logger'

const MAX_MEDIA_BYTES = 16 * 1024 * 1024 // 16MB

/**
 * Download Twilio media, upload to Firebase Storage, return permanent URL.
 * Rejects files larger than 16MB before downloading.
 * ⚠️ Twilio media URLs expire — always re-host to Firebase Storage.
 */
export async function downloadAndRehost(
  twilioMediaUrl: string,
  messageId: string,
  accountSid?: string,
  authToken?: string
): Promise<string> {
  const headers: HeadersInit = {}
  if (accountSid && authToken) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  }

  // HEAD request to check size before downloading
  const headRes = await fetch(twilioMediaUrl, { method: 'HEAD', headers })
  const contentLength = parseInt(headRes.headers.get('content-length') ?? '0', 10)
  if (contentLength > MAX_MEDIA_BYTES) {
    throw new Error(`Media too large: ${contentLength} bytes (max ${MAX_MEDIA_BYTES})`)
  }

  const contentType = headRes.headers.get('content-type') ?? 'application/octet-stream'
  const ext = extensionFromContentType(contentType)

  const res = await fetch(twilioMediaUrl, { headers })
  if (!res.ok) throw new Error(`Failed to fetch media: ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length > MAX_MEDIA_BYTES) {
    throw new Error(`Media too large: ${buffer.length} bytes (max ${MAX_MEDIA_BYTES})`)
  }

  const storagePath = `messages/${messageId}${ext}`
  const bucket = adminStorage.bucket()
  const file = bucket.file(storagePath)

  await file.save(buffer, { contentType })
  await file.makePublic()

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
  })

  logger.info({ storagePath, contentType, bytes: buffer.length }, 'Media rehosted')
  return url
}

function extensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/amr': '.amr',
    'video/mp4': '.mp4',
    'application/pdf': '.pdf',
  }
  const base = contentType.split(';')[0].trim()
  return map[base] ?? '.bin'
}
