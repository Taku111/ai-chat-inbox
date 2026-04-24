import type { ChannelProvider } from '@/types/channel'
import { logger } from '@/lib/logger'

// Scaffold — not yet active. Enable via featureFlags.messengerChannelEnabled
export const messengerChannel: ChannelProvider = {
  name: 'messenger',

  async parseInbound(body, headers) {
    logger.info({ body: body.slice(0, 200) }, 'Messenger webhook received (scaffold)')
    return []
  },

  async sendMessage(msg) {
    logger.warn({ to: msg.to }, 'Messenger sendMessage called but channel not active')
    throw new Error('Messenger channel not active')
  },

  async verifyWebhook(body, headers) {
    return false
  },
}
