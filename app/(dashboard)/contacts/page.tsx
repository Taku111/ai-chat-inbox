'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Contact } from '@/types/contact'
import { Users, Search } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(getDb(), COLLECTIONS.CONTACTS), orderBy('displayName')))
      .then((snap) => {
        setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Contact))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = contacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search)
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900 mb-3">Contacts</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts"
            description="Contacts are created automatically when parents message you."
          />
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {contact.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{contact.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{contact.phoneNumber}</p>
              </div>
              {contact.isBlocked && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Blocked
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
