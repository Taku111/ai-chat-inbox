import type { Transaction } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Contact } from '@/types/contact'

interface UpsertContactResult {
  contact: Contact & { id: string }
  isNew: boolean
}

/**
 * Upsert a contact by phone number inside a Firestore transaction.
 * ⚠️ Must be called within adminDb.runTransaction() — pass the transaction handle.
 * Transaction prevents duplicate contacts when two messages from the same new number
 * arrive simultaneously (both see "no contact" before either writes).
 */
export async function upsertContactInTransaction(
  tx: Transaction,
  phoneNumber: string,
  fromName: string,
  channel: 'whatsapp' | 'messenger' | 'instagram'
): Promise<UpsertContactResult> {
  const contactsQuery = adminDb
    .collection(COLLECTIONS.CONTACTS)
    .where('phoneNumber', '==', phoneNumber)
    .limit(1)

  const existing = await tx.get(contactsQuery)

  if (!existing.empty) {
    const doc = existing.docs[0]
    const data = doc.data() as Contact
    // Update lastContactedAt
    tx.update(doc.ref, {
      lastContactedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { contact: { ...data, id: doc.id }, isNew: false }
  }

  // Create new contact
  const newRef = adminDb.collection(COLLECTIONS.CONTACTS).doc()
  const newContact = {
    phoneNumber,
    displayName: fromName || phoneNumber,
    channels: [channel] as Contact['channels'],
    tags: [],
    notes: '',
    isBlocked: false,
    avatarUrl: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastContactedAt: FieldValue.serverTimestamp(),
    schemaVersion: 1 as const,
  }
  tx.set(newRef, newContact)
  return {
    contact: { ...(newContact as unknown as Contact), id: newRef.id },
    isNew: true,
  }
}
