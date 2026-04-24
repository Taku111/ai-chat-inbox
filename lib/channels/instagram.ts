import type { ChannelProvider } from '@/types/channel'
import { logger } from '@/lib/logger'

// Scaffold — not yet active. Enable via featureFlags.instagramChannelEnabled
export const instagramChannel: ChannelProvider = {
  name: 'instagram',

  async parseInbound(body, headers) {
    logger.info({ body: body.slice(0, 200) }, 'Instagram webhook received (scaffold)')
    return []
  },

  async sendMessage(msg) {
    logger.warn({ to: msg.to }, 'Instagram sendMessage called but channel not active')
    throw new Error('Instagram channel not active')
  },

  async verifyWebhook(body, headers) {
    return false
  },
}
