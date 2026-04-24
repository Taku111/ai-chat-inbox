import { MessageSquare, MessageCircle, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChannelBadgeProps {
  channel: 'whatsapp' | 'messenger' | 'instagram'
  size?: 'sm' | 'md'
}

const config = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', className: 'bg-green-100 text-green-700' },
  messenger: { icon: MessageCircle, label: 'Messenger', className: 'bg-blue-100 text-blue-700' },
  instagram: { icon: Heart, label: 'Instagram', className: 'bg-pink-100 text-pink-700' },
}

export function ChannelBadge({ channel, size = 'sm' }: ChannelBadgeProps) {
  const { icon: Icon, label, className } = config[channel]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
      className
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label}
    </span>
  )
}
