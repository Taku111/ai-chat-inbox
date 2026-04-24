# PROJECT_ANALYSIS — Bexley Inbox
<!-- Created: 2026-04-24 | Session: bexley-inbox-build -->

## 1. Project Overview

**Bexley Inbox** is a production-grade, mobile-first WhatsApp Business shared inbox for Bexley School in Zimbabwe. Multiple school agents can log in, see parent messages in real time, get AI-drafted reply suggestions, and optionally enable an AI mode that replies autonomously.

### Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│  Browser (Next.js React App)                           │
│  - Firebase Auth (client SDK)                          │
│  - Firestore realtime listeners (onSnapshot)           │
│  - Zustand state (AI mode, canned responses cache)     │
└────────────────────────┬───────────────────────────────┘
                         │ HTTP
┌────────────────────────▼───────────────────────────────┐
│  Next.js App Router (API Routes — serverless)          │
│  - /api/auth/session, /api/auth/verify                 │
│  - /api/messages/send                                  │
│  - /api/messages/ai-suggest                            │
│  - /api/ai/auto-reply                                  │
│  - /api/webhooks/whatsapp                              │
│  - /api/agents, /api/contacts, /api/analytics          │
└──────────┬─────────────────────────────┬───────────────┘
           │                             │
┌──────────▼──────────┐    ┌─────────────▼──────────────┐
│  Firebase Admin SDK  │    │  External APIs              │
│  - Firestore (Admin) │    │  - Twilio (WhatsApp send)   │
│  - Firebase Auth     │    │  - Anthropic Claude         │
│  - Firebase Storage  │    │  - OpenAI GPT               │
└─────────────────────┘    │  - Google Gemini             │
                            └────────────────────────────┘
           ↑
┌──────────┴──────────────────────────────────────────┐
│  Cloud Scheduler (Firebase Functions)                │
│  - processAiRequests.ts — runs every 1 minute        │
│    Reads pendingAiRequests where executeAt <= now     │
│    Calls ai-suggest or auto-reply based on mode       │
│  - snoozedConversations.ts — runs every 15 minutes   │
│  - archiveConversations.ts — runs weekly             │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions (from ⚠️ SYSTEM DESIGN notes)

1. **Firestore debounce**: AI fires 60s AFTER last message, not on every message.
   - `pendingAiRequests/{conversationId}` is upserted on every inbound message
   - Cloud Scheduler reads it every minute, calls AI if `executeAt <= now`
   - Prevents 3 AI calls for 3 rapid messages → 1 good call instead

2. **Optimistic UI**: Client generates UUID before sending → shows bubble instantly
   - `messageId` is client-generated, used as Firestore doc ID
   - `status: 'sending'` is CLIENT-ONLY, never written to Firestore
   - On `onSnapshot` confirm: match by ID, remove optimistic copy

3. **Atomic idempotency**: `adminDb.collection(PROCESSED_WEBHOOKS).doc(key).create()`
   - Throws `ALREADY_EXISTS` (gRPC code 6) atomically — no TOCTOU race
   - NOT: get() then set()

4. **onSnapshot only for Open/Pending tabs** — Resolved uses getDocs() to save 60-80% reads

5. **`FieldValue.increment()`** for all counters — never read-then-write

6. **Firebase client.ts**: `try/catch` on `initializeFirestore`, NOT `getApps().length === 1`

7. **Flat collection topology**: conversations are root-level (not nested under contacts)

8. **Content-Type validation** before webhook body reading (security)

### Code Structure

```
bexley-inbox/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/layout.tsx
│   │   ├── conversations/page.tsx + [id]/page.tsx
│   │   ├── contacts/page.tsx
│   │   ├── knowledge-base/page.tsx
│   │   ├── canned-responses/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── agents/page.tsx
│   │   ├── settings/**
│   │   └── audit-log/page.tsx
│   ├── api/
│   │   ├── auth/session, verify
│   │   ├── webhooks/whatsapp (+ status)
│   │   ├── messages/send, ai-suggest
│   │   ├── ai/auto-reply
│   │   ├── agents/**
│   │   ├── contacts/**
│   │   └── analytics
│   └── layout.tsx (root)
├── components/ (auth, chat, conversations, layout, ...)
├── lib/
│   ├── firebase/ (client.ts, admin.ts, collections.ts)
│   ├── ai/ (index, claude, openai, gemini, prompts, rateLimiter)
│   ├── channels/ (whatsapp, messenger, instagram)
│   ├── hooks/ (useConversations, useMessages, useCurrentAgent, ...)
│   ├── stores/ (aiModeStore, cannedResponseStore)
│   ├── utils/ (phone, sanitize, tokens, idempotency, mediaRehost, rankQuickReplies)
│   └── (env, logger, auditLog, featureFlags, twilio)
├── types/ (agent, contact, conversation, message, channel, settings, auditLog, ai)
├── tests/ (unit, integration, e2e)
└── functions/ (processAiRequests, snoozedConversations, archiveConversations)
```

### Process Flow — Inbound Message

```
Twilio → /api/webhooks/whatsapp
  1. Validate Content-Type (application/x-www-form-urlencoded)
  2. Verify Twilio HMAC signature
  3. Parse inbound message
  4. Idempotency check (atomic create())
  5. Transaction: upsert contact + conversation
  6. Media rehost (if applicable, < 16MB)
  7. Save message to Firestore (messages subcollection)
  8. Update conversation counters (FieldValue.increment)
  9. Upsert pendingAiRequests (debounce timer)
  10. Return TwiML 200
  
[60 seconds later]
Cloud Scheduler → reads pendingAiRequests where executeAt <= now
  → calls /api/messages/ai-suggest OR /api/ai/auto-reply
  → saves suggestion to message doc
  → deletes pendingAiRequests doc
```

### Process Flow — Agent Reply

```
Agent types → taps Send
  1. Client generates UUID (messageId + idempotencyKey)
  2. Optimistic message added to local state (status: 'sending')
  3. Input cleared immediately
  4. POST /api/messages/send with UUID
  5. Server writes message (status: 'sent') using UUID as doc ID
  6. Server sends via Twilio
  7. onSnapshot fires → matches UUID → removes optimistic copy
  8. Message now shows single tick (sent)
```

---

## 2. Self-Correction Rules

*(Will be populated as mistakes are made and corrected)*

---

## 3. Bug Tracking Log

*(Will be populated as bugs are found and fixed)*

---

## 4. Pitfalls & Warnings

### PITFALL: setTimeout in serverless
**Risk Level:** High
**Problem:** `setTimeout` cannot debounce across serverless instances — each webhook request may run in a different container
**Prevention:** Use Firestore `pendingAiRequests` + Cloud Scheduler

### PITFALL: Direct counter writes
**Risk Level:** High
**Problem:** Read-then-write on counters causes race conditions (lost increments)
**Prevention:** Always use `FieldValue.increment()` for counters

### PITFALL: onSnapshot on resolved conversations
**Risk Level:** Medium (cost explosion)
**Problem:** 500 resolved conversations with onSnapshot = reads on every change
**Prevention:** Use getDocs() for Resolved/All tabs, onSnapshot only for Open/Pending

### PITFALL: initializeFirestore called twice
**Risk Level:** Medium
**Problem:** HMR re-executes modules; calling initializeFirestore twice throws
**Prevention:** Use try/catch pattern, not getApps().length === 1

---

## 5. Technology Insights

### Firebase
- `initializeFirestore` requires try/catch in Next.js (HMR re-executes modules)
- `FieldValue.increment()` is atomic — required for all counters
- Subcollections cannot be queried across parents without collection group queries
- TTL policies cannot be set via CLI — must be done in Firebase console

### Next.js 16.2.4
- `serverExternalPackages` is the correct config (was `serverComponentsExternalPackages` in <15)
- `firebase-admin`, `pino`, `pino-pretty` are auto-opted-out (no need to add explicitly)
- Middleware runs in Edge runtime — cannot use Node.js crypto (no direct firebase-admin)
- Route handlers in App Router use `export async function POST(req: Request)`

### Twilio
- Always sends `application/x-www-form-urlencoded`
- Retries if no 200 in 15 seconds
- Signature validation uses the full URL including query params

---

## 6. Lessons Learned

*(Will be populated after each phase)*

---

<!-- Updated: 2026-04-24 - Initial creation -->

---

## Session 1 Completion — 2026-04-24

### What Was Built

All 10 phases implemented in a single session:

**Phase 0 (Bootstrap):** All dependencies installed, tsconfig `@/*` alias, jest config, pino logger, Sentry config, .env.example

**Phase 1 (Auth & Layout):** `middleware.ts`, session/verify API routes, `LoginForm.tsx`, Sidebar/MobileNav/TopBar, `ErrorBoundary`, dashboard layout with auth guard

**Phase 2 (Conversations & Messaging Core):** All type files (7), `collections.ts`, utility functions (phone, sanitize, tokens, idempotency, mediaRehost, date), `useConversations` with cursor pagination, `useMessages` with optimistic UI + endBefore/limitToLast, `ChatWindow`, `MessageBubble` (optimistic/confirmed/failed/AI variants), `MessageInput`, `/api/messages/send` (client-generated UUID, atomic idempotency, status: 'sent' never 'sending'), WhatsApp webhook (Content-Type check, HMAC, atomic create(), transaction, debounce upsert)

**Phase 3 (AI Debounce):** Claude/OpenAI/Gemini clients with AbortSignal, `prompts.ts` (KB priority, token budget, quickOptions), `pendingAiRequests` collection, Cloud Scheduler function (`processAiRequests.ts`), `/api/messages/ai-suggest`, `AISuggestionBar` (4 states: shimmer, hidden, stale, full)

**Phase 4 (Autonomous Mode):** Rate limiter (Firestore count()), processing sentinel, `/api/ai/auto-reply` (constant-time secret comparison, full guard chain), `AIModeToggle`

**Phase 5 (Knowledge Base, Quick Replies, Canned Responses):** KB editor, `CannedResponse` with `isQuickReply`/`tags`/`quickReplyOrder`, `cannedResponseStore` (Zustand, preloaded on login), `rankQuickReplies` (client-side, zero reads), `QuickRepliesPanel`, `CannedResponsePicker`

**Phases 6-9:** Contacts, Agents (with compensating transaction), Audit Log, Analytics (5-min cache), Settings, Storage rules, Firestore rules & indexes, channel scaffolds, PWA manifest

### Key Decisions Made

1. **Lazy Firebase Client SDK initialization** — `typeof window === 'undefined'` guard prevents SSR errors during Next.js build-time module evaluation
2. **Proxy pattern for Admin SDK** — `new Proxy({} as Firestore, { get: ... })` defers initialization until first method call, preventing build failures from missing env vars
3. **`functions/` excluded from root tsconfig** — prevents Firebase Functions types from polluting the Next.js TS environment

### Critical Bug Caught

`expoforms-firebase-adminsdk-f6sl8-c4611f972d.json` was accidentally committed via `git add -A`. The key for the `expoforms` Firebase project was exposed in git history. The user must rotate this key immediately.

### RULE Added: Never use `git add -A` blindly
**Date:** 2026-04-24
**Triggered by:** Accidentally committed a Firebase service account key
**Prevention:** Always run `git status` first, then stage specific files by name or directory. Never use `git add -A` or `git add .` without reviewing the status output first.

<!-- Updated: 2026-04-24 - Session 1 complete -->
