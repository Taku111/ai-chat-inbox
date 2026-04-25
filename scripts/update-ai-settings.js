#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-off script: switch AI vendor from Claude → Gemini and enable autonomous mode.
 * Usage: node scripts/update-ai-settings.js
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const fs = require('fs')
const path = require('path')

// Load .env.local
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
}
loadEnv(path.join(__dirname, '../.env.local'))

initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore()

async function run() {
  // 1. Switch global settings to Gemini
  await db.collection('settings').doc('global').update({
    aiVendor: 'gemini',
    aiModel:  'gemini-2.5-flash-preview-05-20',
  })
  console.log('✓  settings/global  →  aiVendor: gemini, aiModel: gemini-2.5-flash-preview-05-20')

  // 2. Enable autonomous mode feature flag
  await db.collection('settings').doc('featureFlags').update({
    aiAutonomousModeEnabled: true,
  })
  console.log('✓  settings/featureFlags  →  aiAutonomousModeEnabled: true')

  console.log('\nDone. Per-conversation aiModeEnabled is still false by default.')
  console.log('Enable it on a conversation from the UI (AI Mode toggle) or run:')
  console.log('  node scripts/update-ai-settings.js --enable-conv <conversationId>')

  // Optional: enable aiModeEnabled on a specific conversation
  const convIdx = process.argv.indexOf('--enable-conv')
  if (convIdx !== -1 && process.argv[convIdx + 1]) {
    const convId = process.argv[convIdx + 1]
    await db.collection('conversations').doc(convId).update({ aiModeEnabled: true })
    console.log(`✓  conversations/${convId}  →  aiModeEnabled: true`)
  }

  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
