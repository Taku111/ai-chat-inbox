/**
 * Seed script — run once before first deployment.
 * Usage: npx ts-node scripts/seed.ts
 *
 * Creates:
 *   settings/global   — default global settings
 *   settings/featureFlags — all flags (aiAutonomousModeEnabled: false by default)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore()

async function seed() {
  console.log('Seeding Firestore...')

  // settings/global
  await db.collection('settings').doc('global').set({
    id: 'global',
    aiVendor: 'claude',
    aiModel: 'claude-haiku-4-5-20251001',
    aiSystemPrompt: '',
    aiDebounceSeconds: 60,
    autoReplyMaxPerHour: 10,
    businessName: 'Bexley School',
    businessDescription: 'A leading school providing quality education in Zimbabwe.',
    defaultAssignment: 'manual',
    autoResolveAfterDays: 0,
    businessHoursEnabled: true,
    businessHoursStart: '07:30',
    businessHoursEnd: '17:00',
    businessHoursTimezone: 'Africa/Harare',
    outOfHoursMessage: 'Thank you for contacting Bexley School. Our office is currently closed. We are open Monday–Friday 7:30am–5:00pm (CAT). We will respond to your message on the next business day.',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seed-script',
    schemaVersion: 1,
  }, { merge: false })
  console.log('✓ settings/global seeded')

  // settings/featureFlags
  await db.collection('settings').doc('featureFlags').set({
    messengerChannelEnabled: false,
    instagramChannelEnabled: false,
    analyticsEnabled: true,
    auditLogEnabled: true,
    knowledgeBaseEnabled: true,
    cannedResponsesEnabled: true,
    aiSuggestionsEnabled: true,
    aiAutonomousModeEnabled: false,  // Keep false until Phase 4 is fully verified
  }, { merge: false })
  console.log('✓ settings/featureFlags seeded')

  // Example Knowledge Base entries
  const kbEntries = [
    {
      title: 'School Opening Hours',
      content: 'Bexley School is open Monday to Friday, 7:30am to 5:00pm Central Africa Time (CAT). Gates close at 5pm. The school is closed on public holidays and school holidays.',
      category: 'Schedule',
      priority: 1,
      isActive: true,
    },
    {
      title: 'Fee Payment Methods',
      content: 'School fees can be paid via EcoCash to 0771234567, bank transfer to Bexley School account (ZB Bank, Account: 1234567890), or cash at the school bursar\'s office. Receipts are issued for all payments.',
      category: 'Fees',
      priority: 1,
      isActive: true,
    },
    {
      title: 'Admissions Process',
      content: 'To enrol at Bexley School, contact the admissions office at admissions@bexley.ac.zw or call +263 77 123 4567. Required documents: birth certificate, previous school reports (last 2 years), passport photos (x2), and proof of residence.',
      category: 'Admissions',
      priority: 2,
      isActive: true,
    },
  ]

  for (const entry of kbEntries) {
    await db.collection('knowledgeBase').add({
      ...entry,
      createdBy: 'seed-script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      schemaVersion: 1,
    })
  }
  console.log(`✓ ${kbEntries.length} knowledge base entries seeded`)

  // Example Quick Replies
  const quickReplies = [
    {
      shortcode: 'fees',
      title: 'Fee Payment Info',
      body: 'School fees can be paid via EcoCash to 0771234567, bank transfer, or cash at the bursar\'s office. Please request a receipt after payment.',
      category: 'Fees',
      tags: ['fees', 'payment', 'ecoCash', 'bank', 'transfer'],
      isQuickReply: true,
      quickReplyOrder: 1,
      usageCount: 0,
      lastUsedAt: null,
    },
    {
      shortcode: 'hours',
      title: 'Opening Hours',
      body: 'Bexley School is open Monday to Friday, 7:30am to 5:00pm. We are closed on weekends and public holidays.',
      category: 'Schedule',
      tags: ['hours', 'open', 'close', 'time', 'schedule'],
      isQuickReply: true,
      quickReplyOrder: 2,
      usageCount: 0,
      lastUsedAt: null,
    },
    {
      shortcode: 'hello',
      title: 'Greeting',
      body: 'Hello! Thank you for contacting Bexley School. How can I help you today?',
      category: 'General',
      tags: ['hello', 'hi', 'greet', 'welcome'],
      isQuickReply: true,
      quickReplyOrder: 3,
      usageCount: 0,
      lastUsedAt: null,
    },
  ]

  for (const r of quickReplies) {
    await db.collection('cannedResponses').add({
      ...r,
      createdBy: 'seed-script',
      updatedBy: 'seed-script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      schemaVersion: 1,
    })
  }
  console.log(`✓ ${quickReplies.length} canned responses / quick replies seeded`)

  console.log('\nSeed complete. Next steps:')
  console.log('1. Create your first admin agent in Firebase Auth console')
  console.log('2. Create the matching document in Firestore: agents/{uid}')
  console.log('3. Set Twilio webhook URL to: ' + (process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-domain.com') + '/api/webhooks/whatsapp')
  console.log('4. Configure TTL policies in Firebase console for processedWebhooks (30d) and pendingAiRequests (24h)')
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
