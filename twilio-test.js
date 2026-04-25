#!/usr/bin/env node
/**
 * twilio-test.js — Simulate a real Twilio WhatsApp inbound webhook POST to localhost.
 *
 * Reads credentials from .env.local automatically.
 *
 * Usage:
 *   node twilio-test.js                          # default test message
 *   node twilio-test.js "Hello from a parent!"   # custom message
 *   node twilio-test.js "Hi" +263771234567        # custom message + sender number
 */

const crypto = require('crypto')
const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

// ── Load .env.local ────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
}

loadEnvFile(path.join(__dirname, '.env.local'))

// ── Config ─────────────────────────────────────────────────────────────────────
const AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN
const ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID
const TO_NUMBER     = process.env.TWILIO_WHATSAPP_NUMBER || '+263784978232'
const APP_URL       = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const WEBHOOK_PATH  = '/api/webhooks/whatsapp'
const WEBHOOK_URL   = APP_URL + WEBHOOK_PATH

if (!AUTH_TOKEN || !ACCOUNT_SID) {
  console.error('ERROR: TWILIO_AUTH_TOKEN and TWILIO_ACCOUNT_SID must be set in .env.local')
  process.exit(1)
}

const messageText  = process.argv[2] || 'Hello! My child is sick today and will not be attending school.'
const fromRaw      = process.argv[3] || '+27616183243'
const fromNumber   = fromRaw.startsWith('+') ? fromRaw : `+${fromRaw}`

// ── Build payload ──────────────────────────────────────────────────────────────
// MessageSid must start with SM and be 34 chars total
const messageSid = `SM${crypto.randomBytes(16).toString('hex')}`

const params = {
  AccountSid:    ACCOUNT_SID,
  ApiVersion:    '2010-04-01',
  Body:          messageText,
  From:          `whatsapp:${fromNumber}`,
  MessageSid:    messageSid,
  NumMedia:      '0',
  NumSegments:   '1',
  ProfileName:   'Test Parent',
  SmsSid:        messageSid,
  SmsMessageSid: messageSid,
  SmsStatus:     'received',
  To:            `whatsapp:${TO_NUMBER}`,
  WaId:          fromNumber.replace(/^\+/, ''),
}

// ── Compute Twilio HMAC-SHA1 signature ────────────────────────────────────────
// Twilio spec: HMAC-SHA1(authToken, url + sorted(k+v pairs)), base64 encoded
function computeTwilioSignature(authToken, url, formParams) {
  const sortedKeys = Object.keys(formParams).sort()
  const postData   = sortedKeys.reduce((acc, k) => acc + k + formParams[k], '')
  return crypto.createHmac('sha1', authToken).update(url + postData).digest('base64')
}

const signature = computeTwilioSignature(AUTH_TOKEN, WEBHOOK_URL, params)

// ── Encode body ────────────────────────────────────────────────────────────────
const body = Object.entries(params)
  .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  .join('&')

// ── Send request ───────────────────────────────────────────────────────────────
const url        = new URL(WEBHOOK_URL)
const isHttps    = url.protocol === 'https:'
const transport  = isHttps ? https : http

const options = {
  hostname: url.hostname,
  port:     url.port || (isHttps ? 443 : 3000),
  path:     url.pathname,
  method:   'POST',
  headers:  {
    'Content-Type':        'application/x-www-form-urlencoded',
    'Content-Length':      Buffer.byteLength(body),
    'X-Twilio-Signature':  signature,
    'User-Agent':          'TwilioProxy/1.1',
  },
}

console.log('\n=== Twilio Webhook Test ===')
console.log(`Target:     ${WEBHOOK_URL}`)
console.log(`From:       whatsapp:${fromNumber}`)
console.log(`To:         whatsapp:${TO_NUMBER}`)
console.log(`Message:    "${messageText}"`)
console.log(`MessageSid: ${messageSid}`)
console.log(`Signature:  ${signature}`)
console.log('===========================\n')

const req = transport.request(options, (res) => {
  let data = ''
  res.on('data', chunk => { data += chunk })
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`✓  ${res.statusCode} — webhook accepted, message stored in Firestore`)
      console.log(`   TwiML: ${data.trim()}`)
    } else {
      console.error(`✗  ${res.statusCode} — webhook rejected`)
      console.error(`   Body: ${data.trim()}`)
      if (res.statusCode === 401) {
        console.error('\n   Hint: signature mismatch — check TWILIO_AUTH_TOKEN in .env.local')
        console.error('   Also ensure NEXT_PUBLIC_APP_URL matches the URL used above.')
      }
      if (res.statusCode === 400) {
        console.error('\n   Hint: Content-Type rejected (should not happen with this script)')
      }
    }
  })
})

req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.error(`✗  Connection refused — is the dev server running?`)
    console.error(`   Run:  npm run dev`)
  } else {
    console.error(`✗  Request error: ${err.message}`)
  }
})

req.write(body)
req.end()
