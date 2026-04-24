'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Users, BookOpen, Zap, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/conversations', icon: MessageSquare, label: 'Inbox' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/knowledge-base', icon: BookOpen, label: 'KB' },
  { href: '/canned-responses', icon: Zap, label: 'Quick' },
  { href: '/analytics', icon: BarChart2, label: 'Stats' },
]

export function MobileNav() {
  const pathname = usePathname()
  // Hide bottom nav when a conversation is open (full-screen chat)
  const isChatOpen = /^\/conversations\/.+/.test(pathname)
  if (isChatOpen) return null

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors',
                active ? 'text-green-600' : 'text-gray-500'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
