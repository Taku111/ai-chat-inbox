'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageSquare, Users, BookOpen, Zap, BarChart2,
  UserCheck, Settings, ClipboardList, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/types/agent'

const NAV_ITEMS = [
  { href: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { href: '/canned-responses', icon: Zap, label: 'Quick Replies' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
]

const ADMIN_NAV_ITEMS = [
  { href: '/agents', icon: UserCheck, label: 'Agents' },
  { href: '/audit-log', icon: ClipboardList, label: 'Audit Log' },
]

interface SidebarProps {
  agent: Agent | null
}

export function Sidebar({ agent }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut(auth)
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-sm">Bexley Inbox</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}

        {agent?.role === 'admin' && (
          <>
            <div className="my-2 border-t border-gray-100" />
            {ADMIN_NAV_ITEMS.map(item => (
              <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
            ))}
          </>
        )}

        <div className="my-2 border-t border-gray-100" />
        <NavItem href="/settings" icon={Settings} label="Settings" active={pathname.startsWith('/settings')} />
      </nav>

      {/* User footer */}
      {agent && (
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{agent.displayName}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{agent.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-green-50 text-green-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  )
}
