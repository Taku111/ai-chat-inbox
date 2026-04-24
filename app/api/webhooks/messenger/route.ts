import { logger } from '@/lib/logger'

// Scaffold — not yet active
export async function GET(req: Request) {
  const url = new URL(req.url)
  const challenge = url.searchParams.get('hub.challenge')
  if (challenge) return new Response(challenge)
  return new Response('OK')
}

export async function POST(req: Request) {
  logger.info('Messenger webhook received (scaffold — not active)')
  return Response.json({ status: 'channel_not_active' })
}
