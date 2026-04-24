import { cn } from '@/lib/utils'

interface StatusDotProps {
  status: 'online' | 'offline' | 'away'
  size?: 'sm' | 'md'
}

const colors = {
  online: 'bg-green-400',
  offline: 'bg-gray-300',
  away: 'bg-yellow-400',
}

export function StatusDot({ status, size = 'sm' }: StatusDotProps) {
  return (
    <span
      className={cn(
        'rounded-full border-2 border-white',
        size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3',
        colors[status]
      )}
    />
  )
}
