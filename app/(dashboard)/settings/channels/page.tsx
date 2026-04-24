'use client'

import { MessageSquare, MessageCircle, Heart, CheckCircle, ExternalLink } from 'lucide-react'

export default function ChannelsPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-domain.com'
  const whatsappWebhookUrl = `${appUrl}/api/webhooks/whatsapp`

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">Channels</h1>
        <p className="text-xs text-gray-500">Manage connected messaging channels</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* WhatsApp */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">WhatsApp Business</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">Webhook URL</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 flex-1 truncate font-mono">
                  {whatsappWebhookUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(whatsappWebhookUrl)}
                  className="text-xs text-green-600 hover:text-green-700 font-medium whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Set this URL in your Twilio Console under WhatsApp → Sandbox/Number configuration → &quot;A message comes in&quot;.
                Also set the status callback URL to <code className="bg-gray-100 rounded px-1">{whatsappWebhookUrl}/status</code>
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">WhatsApp Number</p>
              <p className="text-xs text-gray-500">
                Set <code className="bg-gray-100 rounded px-1">TWILIO_WHATSAPP_NUMBER</code> in your environment variables.
              </p>
            </div>

            <a
              href="https://console.twilio.com/us1/develop/sms/settings/whatsapp-enabled-numbers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Open Twilio Console
            </a>
          </div>
        </div>

        {/* Facebook Messenger — scaffold */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Facebook Messenger</h2>
              <span className="text-xs text-gray-400">Not yet active</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Requires Meta app review for <code>pages_messaging</code> permission.
            Enable via the <code>messengerChannelEnabled</code> feature flag once approved.
          </p>
        </div>

        {/* Instagram — scaffold */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Instagram DM</h2>
              <span className="text-xs text-gray-400">Not yet active</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Requires Meta app review. Enable via the <code>instagramChannelEnabled</code> feature flag once approved.
          </p>
        </div>
      </div>
    </div>
  )
}
