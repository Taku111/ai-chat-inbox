# Bexley Inbox — Full Technical Project Plan
## AI-Assisted WhatsApp Business Inbox (Next.js + Firebase)
### Revision 2 — System Design Audit Applied
## AFTER EACH PHASE AND FOR EACH TEST, USE PLAYWRITE TO OPEN THE PROJECT AND TEST THAT EVERYTHING LOOKS AS IT SHOULD, BUTTONS ARE WORKING AND EVERTHING IS AS SHOULD. BE LIKE A STRICT QA TESTER AND GIVE FEEDBACK ON WHAT NEEDS TO HAPPEN TO MAKE IT BETTER.
## AS YOU CODE, IF YOU NEED SUBAGENTS OR SKILLS TO BETTER THE QUALITY OF CODE. LOOK UP HOW TO CREATE A GREAT SKILL/AGENT AND ADD IT IN TO YOUR TOOLSET.
## MAKE NOTES ON THEINGS YOU STUGGLED WITH BUT OVERCAME SO THAT YOU DONT NEED TO STUGGLE WITH THEM IF YOU COME ACROSS THEM AGAIN.

> **Target audience:** This document is a complete, unambiguous technical specification to be handed to Claude Code or a senior developer. Every feature, data model, API contract, component, and test is described explicitly. Follow it in order. Do not skip sections.
>
> **System design audit notes** are marked with `⚠️ SYSTEM DESIGN:` throughout. These are not optional commentary — they represent decisions that prevent data loss, security breaches, race conditions, and production outages. Read every one before implementing the section it appears in.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables](#4-environment-variables)
5. [Firebase Setup](#5-firebase-setup)
6. [Firestore Data Models](#6-firestore-data-models)
7. [Firebase Security Rules](#7-firebase-security-rules)
8. [Authentication Module](#8-authentication-module)
9. [Core Layout & Navigation](#9-core-layout--navigation)
10. [Conversation List Module](#10-conversation-list-module)
11. [Conversation Detail / Chat Module](#11-conversation-detail--chat-module)
12. [AI Reply Module](#12-ai-reply-module)
13. [AI Autonomous Mode (Auto-Reply Toggle)](#13-ai-autonomous-mode-auto-reply-toggle)
14. [Multi-Vendor AI Integration](#14-multi-vendor-ai-integration)
15. [Twilio WhatsApp Webhook](#15-twilio-whatsapp-webhook)
16. [Agent Management Module](#16-agent-management-module)
17. [Contact Management Module](#17-contact-management-module)
18. [Inbox Settings Module](#18-inbox-settings-module)
19. [Knowledge Base Module](#19-knowledge-base-module)
20. [Canned Responses Module](#20-canned-responses-module)
21. [Audit Log Module](#21-audit-log-module)
22. [Notification System](#22-notification-system)
23. [Search Module](#23-search-module)
24. [Analytics & Reporting Module](#24-analytics--reporting-module)
25. [Channel Expansion: Facebook & Instagram (Scaffold)](#25-channel-expansion-facebook--instagram-scaffold)
26. [Mobile Optimisation](#26-mobile-optimisation)
27. [Observability & Error Handling](#27-observability--error-handling)
28. [Testing Strategy](#28-testing-strategy)
29. [Deployment](#29-deployment)
30. [Feature Flags](#30-feature-flags)
31. [Task Checklist](#31-task-checklist)

---

## 1. Project Overview

**Project name:** `bexley-inbox`

**Purpose:** A mobile-first, multi-agent shared inbox for WhatsApp Business messages. Agents log in, view conversations in real time, send replies, and optionally let AI reply on their behalf. AI suggestions are shown inline; the agent can tap to send with one touch. The system is designed to be channel-agnostic — WhatsApp is the first channel, with Facebook Messenger and Instagram DM ready to be activated without architectural changes.

**Core principles:**
- Every action is tied to an authenticated agent (full accountability)
- AI assistance is a tool, not a replacement — agents stay in control unless they explicitly enable autonomous mode
- All message data lives in Firestore — no external database needed
- The app must be fully usable on a mobile phone browser (PWA-ready)
- AI vendor is swappable via a config toggle — no hard-coded provider

> ⚠️ **SYSTEM DESIGN — Design for Failure First:**
> Every external call in this system (Twilio, AI vendors, Firestore) can and will fail at some point. The architecture must assume failure is normal, not exceptional. This means: every external call has a timeout, every critical operation is idempotent (safe to retry), every error is logged with enough context to debug, and no user-visible action should silently fail. The sections below enforce this principle throughout. Skipping any of these safeguards is not a shortcut — it is creating a bug that will appear in production at the worst possible time.

---

## 2. Tech Stack & Dependencies

### Framework & Hosting
```
next@14.x (App Router)
firebase@10.x (client SDK)
firebase-admin@12.x (server SDK, used in API routes)
```

### UI
```
tailwindcss@3.x
shadcn/ui (component library)
lucide-react (icons)
clsx, tailwind-merge
```

### AI Providers
```
@anthropic-ai/sdk        # Claude (Haiku 4.5 default)
openai                   # OpenAI (GPT-4o-mini)
@google/generative-ai    # Gemini (gemini-1.5-flash)
```

### Messaging
```
twilio (server-side only)
```

### Utilities
```
date-fns                 # Date formatting
react-hot-toast          # Toast notifications
zustand                  # Client state (AI mode toggle, active conversation)
zod                      # Runtime validation of API payloads and env vars
uuid                     # Generate idempotency keys
```

### Observability
```
pino                     # Structured JSON logging (server-side)
pino-pretty              # Human-readable logs in development
@sentry/nextjs           # Error tracking and performance monitoring
```

> ⚠️ **SYSTEM DESIGN — Observability is not optional:**
> `console.log` and `console.error` are invisible in production Firebase App Hosting. You will have zero visibility into what went wrong when a message fails to send, an AI call times out, or a webhook is rejected. `pino` outputs structured JSON queryable in Google Cloud Logging. Sentry captures unhandled exceptions with full stack traces. Both must be configured before Phase 1 is complete. Without these, debugging production issues requires guesswork.

### Testing
```
jest
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
msw@2.x                  # Mock Service Worker
firebase-admin (test helpers)
```

### Dev Tools
```
eslint, prettier
typescript@5.x
husky + lint-staged      # Pre-commit hooks
```

---

## 3. Repository Structure

```
bexley-inbox/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── conversations/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── contacts/page.tsx
│   │   ├── knowledge-base/page.tsx
│   │   ├── canned-responses/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── agents/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── ai/page.tsx
│   │   │   └── channels/page.tsx
│   │   └── audit-log/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── session/route.ts
│   │   │   └── verify/route.ts        # Lightweight — used by middleware
│   │   ├── webhooks/
│   │   │   ├── whatsapp/
│   │   │   │   ├── route.ts           # Inbound messages
│   │   │   │   └── status/route.ts    # Delivery status callbacks
│   │   │   ├── messenger/route.ts     # Scaffold
│   │   │   └── instagram/route.ts     # Scaffold
│   │   ├── messages/
│   │   │   ├── send/route.ts
│   │   │   └── ai-suggest/route.ts
│   │   ├── ai/
│   │   │   └── auto-reply/route.ts
│   │   ├── agents/
│   │   │   ├── route.ts
│   │   │   └── [uid]/route.ts
│   │   ├── contacts/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── analytics/route.ts
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── ui/
│   ├── auth/LoginForm.tsx
│   ├── conversations/
│   │   ├── ConversationList.tsx
│   │   ├── ConversationItem.tsx
│   │   ├── ConversationFilters.tsx
│   │   └── AssignmentBadge.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── QuickRepliesPanel.tsx      # Always-visible tap-to-send panel
│   │   ├── AISuggestionBar.tsx
│   │   ├── AIModeToggle.tsx
│   │   └── TypingIndicator.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   └── TopBar.tsx
│   ├── knowledge-base/
│   │   ├── KnowledgeBaseList.tsx
│   │   └── KnowledgeBaseEditor.tsx
│   ├── canned-responses/CannedResponsePicker.tsx
│   ├── contacts/
│   │   ├── ContactList.tsx
│   │   └── ContactCard.tsx
│   ├── analytics/MetricsCards.tsx
│   └── shared/
│       ├── ChannelBadge.tsx
│       ├── StatusDot.tsx
│       ├── ErrorBoundary.tsx          # NEW — catches render errors per section
│       └── EmptyState.tsx
│
├── lib/
│   ├── firebase/
│   │   ├── client.ts
│   │   ├── admin.ts
│   │   ├── collections.ts
│   │   └── converters.ts
│   ├── ai/
│   │   ├── index.ts
│   │   ├── claude.ts
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   ├── prompts.ts
│   │   └── rateLimiter.ts
│   ├── twilio.ts                      # Singleton Twilio client
│   ├── channels/
│   │   ├── index.ts
│   │   ├── whatsapp.ts
│   │   ├── messenger.ts
│   │   └── instagram.ts
│   ├── hooks/
│   │   ├── useConversations.ts
│   │   ├── useMessages.ts
│   │   ├── useAIMode.ts
│   │   ├── useCurrentAgent.ts
│   │   └── useOnlineStatus.ts
│   ├── stores/
│   │   ├── aiModeStore.ts
│   │   └── cannedResponseStore.ts     # Preloaded on login, filtered client-side
│   ├── validators/
│   │   ├── webhook.ts
│   │   └── api.ts
│   ├── logger.ts                      # Pino structured logger singleton
│   ├── auditLog.ts                    # Non-blocking audit log writer
│   ├── featureFlags.ts                # NEW — cached flag reader (60s TTL)
│   ├── env.ts                         # Zod env validation
│   └── utils/
│       ├── date.ts
│       ├── phone.ts
│       ├── sanitize.ts                # NEW — input sanitisation
│       ├── idempotency.ts             # NEW — idempotency key helpers
│       ├── mediaRehost.ts             # NEW — Twilio media → Firebase Storage
│       ├── rankQuickReplies.ts        # Client-side contextual sort — zero Firestore reads
│       └── tokens.ts
│
├── types/
│   ├── conversation.ts
│   ├── message.ts
│   ├── agent.ts
│   ├── contact.ts
│   ├── channel.ts
│   ├── settings.ts
│   ├── auditLog.ts
│   └── ai.ts
│
├── tests/
│   ├── unit/
│   │   ├── ai/
│   │   ├── webhooks/
│   │   └── utils/
│   ├── integration/api/
│   └── e2e/                          # Playwright, Phase 2
│
├── public/
│   ├── manifest.json
│   └── icons/
│
├── .env.local
├── .env.example
├── firebase.json
├── firestore.rules
├── storage.rules                      # NEW — Firebase Storage rules
├── firestore.indexes.json
├── jest.config.ts
├── jest.setup.ts
├── next.config.js
├── sentry.client.config.ts            # NEW
├── sentry.server.config.ts            # NEW
├── tailwind.config.ts
├── CHANGELOG.md                       # NEW — track changes per deploy
└── tsconfig.json
```

---

## 4. Environment Variables

```env
# Firebase Client (public — safe to expose to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server only — never NEXT_PUBLIC_)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Twilio (server only)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=               # E.164 format: +1234567890

# AI Providers (server only)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Active AI vendor — one of: claude | openai | gemini
AI_VENDOR=claude
AI_MODEL=claude-haiku-4-5-20251001

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
WEBHOOK_SECRET=                       # Min 32 chars — generate: openssl rand -hex 32

# Observability
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=              # Same value — needed client-side
SENTRY_ORG=
SENTRY_PROJECT=
LOG_LEVEL=info                        # debug | info | warn | error
```

> ⚠️ **SYSTEM DESIGN — Environment variable validation prevents silent misconfiguration:**
> Without startup validation, a missing `TWILIO_AUTH_TOKEN` causes a cryptic runtime error deep in a webhook handler — often discovered only after a parent's message went nowhere. The Zod schema below catches every misconfiguration at deploy time, before any request is served. The `WEBHOOK_SECRET` enforces a minimum of 32 characters — a short or guessable secret allows any external party to trigger autonomous AI replies on your behalf. Generate it with `openssl rand -hex 32` and treat it like a password.

### `lib/env.ts`

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(100), // PEM keys are always long
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').min(34),
  TWILIO_AUTH_TOKEN: z.string().min(32),
  TWILIO_WHATSAPP_NUMBER: z.string().startsWith('+').min(10),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  AI_VENDOR: z.enum(['claude', 'openai', 'gemini']).default('claude'),
  AI_MODEL: z.string().optional(),
  WEBHOOK_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().url().optional(),
}).refine(
  (d) => d.ANTHROPIC_API_KEY || d.OPENAI_API_KEY || d.GOOGLE_GENERATIVE_AI_API_KEY,
  { message: 'At least one AI provider API key must be present' }
)

export const env = envSchema.parse(process.env)
```

---

## 5. Firebase Setup

### 5.1 Services to Enable

- **Authentication** — Email/Password only
- **Firestore** — Native mode, region: `europe-west1`
- **Storage** — For media attachments
- **App Hosting** — For Next.js deployment

> ⚠️ **SYSTEM DESIGN — Region selection is permanent:**
> The original plan specified `us-central1`. For users in Zimbabwe and South Africa, `europe-west1` (Belgium) reduces round-trip latency by 60–100ms on every Firestore read, every webhook response, and every page load. Firestore regions cannot be changed after creation — the project must be deleted and recreated to change regions. Choose once, choose correctly.

### 5.2 `lib/firebase/client.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = { /* NEXT_PUBLIC_ vars */ }

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// ⚠️ SYSTEM DESIGN — Use initializeFirestore, NOT getFirestore, to enable persistent offline cache.
// enableIndexedDbPersistence() is deprecated since Firebase v9 and removed in v10.
// persistentMultipleTabManager allows multiple browser tabs without cache conflicts.
//
// ⚠️ SYSTEM DESIGN — The singleton guard must check BEFORE initializeApp, not after:
// getApps().length === 0 means we JUST initialized above. We must call initializeFirestore
// on the new app. If getApps().length > 1, the app already existed — call getFirestore.
// The condition below is correct: initialize Firestore only for the newly created app.
// In Next.js HMR (hot module reload) during development, this module re-executes.
// The getApps() guard on initializeApp above ensures only one app exists, so
// initializeFirestore is called exactly once per app instance.
let db: ReturnType<typeof getFirestore>
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  })
} catch {
  // initializeFirestore throws if called more than once for the same app.
  // In that case, fall back to getFirestore which returns the existing instance.
  db = getFirestore(app)
}

export const auth = getAuth(app)
export { db }
export const storage = getStorage(app)
```

### 5.3 `lib/firebase/admin.ts`

```typescript
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// ⚠️ SYSTEM DESIGN — Singleton pattern for serverless:
// Next.js API routes run serverlessly. On a warm start, the same process is reused.
// Without the getApps() guard, each warm-start call re-initialises Firebase Admin
// and throws "Firebase App named '[DEFAULT]' already exists".
// The guard ensures initialisation happens exactly once per process lifetime.

let app: App
if (!getApps().length) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
} else {
  app = getApps()[0]
}

export const adminDb = getFirestore(app)
export const adminAuth = getAuth(app)
```

---

## 6. Firestore Data Models

### 6.0 Collection Topology — Why It Is Structured This Way

Before touching any document shape, understand the structural decisions and why alternatives were rejected. Getting this wrong is permanent — Firestore collection structure cannot be migrated without rewriting all data.

```
Root collections:
  agents/            — flat, queried by role/status across all agents
  contacts/          — flat, queried by phone number (cross-agent)
  conversations/     — flat, queried by status/assignedTo (cross-agent, cross-contact)
    └── messages/    — subcollection, queried only within one conversation
  knowledgeBase/     — flat, all agents share the same KB
  cannedResponses/   — flat, all agents share canned responses
  auditLogs/         — flat, admin queries across all agents and conversations
  settings/          — flat, singleton documents
  processedWebhooks/ — flat, keyed by externalId (cross-conversation idempotency)
```

> ⚠️ **SYSTEM DESIGN — Why conversations and contacts are flat root collections, not nested:**
> The intuitive structure is `contacts/{id}/conversations/{id}` — a contact "owns" their conversations. This feels natural but it destroys the ability to query across contacts: `"show me all open conversations assigned to Agent X"` becomes impossible in Firestore because you cannot query across subcollections unless you use a collection group query, and collection group queries cannot be filtered by a parent document field. Flat root collections allow: `where('assignedTo', '==', agentId)`, `where('status', '==', 'open')`, `orderBy('lastMessageAt')` — all in one query. This is the primary access pattern. Keep conversations flat.

> ⚠️ **SYSTEM DESIGN — Why messages are a subcollection of conversations, not a flat root collection:**
> Putting messages in a root `messages/` collection would allow cross-conversation queries like "all unread messages across all conversations". But this is never needed — agents always look at messages *within* a specific conversation. The subcollection structure means Firestore security rules can scope message access to authenticated agents who have access to the parent conversation. It also means message writes are naturally partitioned — no two conversations write to the same area of the database, which eliminates write contention on message creation. The subcollection also co-locates data on the same Firestore backend shard as its parent conversation document, improving read performance.

> ⚠️ **SYSTEM DESIGN — Why `processedWebhooks` is a root collection, not nested under conversations:**
> The idempotency check must happen BEFORE a conversation is identified — the contact and conversation may not exist yet when the webhook arrives. A subcollection under conversations (`conversations/{id}/processedWebhooks/{key}`) would require knowing the `conversationId` first, which creates a chicken-and-egg problem. Root-level `processedWebhooks` keyed by `whatsapp-{MessageSid}` allows the check to happen immediately on webhook receipt, before any other Firestore operations.

> ⚠️ **SYSTEM DESIGN — `schemaVersion` on every document prevents silent data corruption:**
> Firestore has no schema enforcement. Deploy a code change that adds a required field, and every existing document that lacks that field returns `undefined` at runtime — causing TypeScript type errors at runtime, not at compile time. The `schemaVersion` field lets you detect and migrate old documents. Start at `1`. Increment whenever you make a breaking change to a document's required fields.
>
> **Migration strategy (do not skip this):**
> Never do a big-bang migration that updates all documents at once — this can take hours and blocks deploys. Use a lazy migration pattern instead:
> 1. Deploy code that reads both v1 AND v2 documents (backward compatible read)
> 2. On read: if `schemaVersion < current`, migrate the document in-place and write it back
> 3. After 1–2 weeks: deploy code that assumes all documents are at the new version
> 4. Optionally run a background script to migrate any remaining old documents
>
> This approach means migrations happen naturally as documents are accessed, with zero downtime and zero risk of a partial migration leaving the system in a broken state.

### 6.1 `lib/firebase/collections.ts`

```typescript
export const COLLECTIONS = {
  AGENTS: 'agents',
  CONVERSATIONS: 'conversations',
  MESSAGES: (conversationId: string) => `conversations/${conversationId}/messages`,
  ARCHIVED_CONVERSATIONS: 'archivedConversations',
  ARCHIVED_MESSAGES: (conversationId: string) => `archivedConversations/${conversationId}/messages`,
  CONTACTS: 'contacts',
  KNOWLEDGE_BASE: 'knowledgeBase',
  CANNED_RESPONSES: 'cannedResponses',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
  PROCESSED_WEBHOOKS: 'processedWebhooks',   // Idempotency records
  PENDING_AI_REQUESTS: 'pendingAiRequests',  // Debounce queue — one doc per active conversation
} as const

// ⚠️ Never hardcode collection name strings in component or API files.
// A typo silently reads from a different collection with no error thrown.
```

### 6.2 `types/agent.ts`

```typescript
export type AgentRole = 'admin' | 'agent' | 'viewer'

export interface Agent {
  uid: string
  email: string
  displayName: string
  avatarUrl?: string
  role: AgentRole
  isOnline: boolean
  isActive: boolean       // False if deactivated — separate from Firebase Auth disabled
  lastSeenAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}
```

### 6.3 `types/contact.ts`

```typescript
export interface Contact {
  id: string
  phoneNumber: string     // E.164 — always normalised via normalizePhone()
  displayName: string
  avatarUrl?: string
  channels: ('whatsapp' | 'messenger' | 'instagram')[]
  tags: string[]
  notes: string
  isBlocked: boolean      // Prevents AI auto-reply — checked before every AI call
  createdAt: Timestamp
  updatedAt: Timestamp
  lastContactedAt: Timestamp
  schemaVersion: 1
}
```

> ⚠️ **SYSTEM DESIGN — `isBlocked` is a critical safety valve:**
> Autonomous AI mode has no human in the loop. A contact who is abusive, sends spam, or who the school needs to stop communicating with must be silenceable immediately without disabling AI mode for everyone. `isBlocked = true` must be checked in the auto-reply route before any AI call or Twilio send. Without this, a blocked contact continues receiving AI replies indefinitely.

### 6.4 `types/conversation.ts`

```typescript
export interface Conversation {
  id: string
  contactId: string
  contactName: string         // Denormalised — update when contact is renamed
  contactPhone: string
  channel: 'whatsapp' | 'messenger' | 'instagram'
  status: 'open' | 'resolved' | 'pending' | 'snoozed'
  assignedTo: string | null
  assignedToName: string | null

  // ⚠️ Per-agent unread tracking — see note below
  unreadCount: number               // Total unread (for badge display on list)
  agentUnreadCounts: Record<string, number>  // { [agentUid]: unreadCount }

  lastMessage: string
  lastMessageAt: Timestamp
  lastMessageDirection: 'inbound' | 'outbound'
  lastAiSuggestionMessageId: string | null  // Points to the message doc holding current suggestion
  aiModeEnabled: boolean
  aiModeEnabledAt: Timestamp | null
  aiModeEnabledBy: string | null
  tags: string[]
  isTyping: boolean
  snoozedUntil: Timestamp | null
  resolvedAt: Timestamp | null      // When the conversation was resolved — needed for analytics
  firstResponseAt: Timestamp | null // When the first outbound message was sent — for response time metrics
  messageCount: number              // Total message count — maintained via increment, avoids count() queries
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}
```

> ⚠️ **SYSTEM DESIGN — `agentUnreadCounts` enables per-agent unread badges without extra queries:**
> The original plan had a single `unreadCount`. In a multi-agent inbox, Agent A may have already read a message while Agent B hasn't. With a shared counter, both agents see `unreadCount = 0` after either one reads. With `agentUnreadCounts: { 'agent-uid-1': 3, 'agent-uid-2': 0 }`, each agent sees their own unread state. Reset via `FieldValue.increment(-n)` on the specific agent's key — still atomic, still server-side. The top-level `unreadCount` is kept as the sum and used for the conversation list sort order.

> ⚠️ **SYSTEM DESIGN — `lastAiSuggestionMessageId` prevents a scan to find the current suggestion:**
> Without this field, the UI would need to query the messages subcollection to find the most recent message with a non-null `aiSuggestion`. That's a read into the subcollection every time the agent opens a conversation. With `lastAiSuggestionMessageId` on the conversation document, the UI can fetch the exact suggestion message in one targeted read — `doc(db, COLLECTIONS.MESSAGES(conversationId), lastAiSuggestionMessageId)`.

> ⚠️ **SYSTEM DESIGN — `messageCount`, `resolvedAt`, and `firstResponseAt` eliminate expensive analytics queries:**
> Without `messageCount`, counting messages per conversation requires a `count()` aggregation query against the subcollection. With thousands of conversations, this becomes expensive. `messageCount` is maintained via `FieldValue.increment(1)` on every message write — zero extra cost at write time, eliminates the aggregation at read time. Similarly, `resolvedAt` and `firstResponseAt` are set once and never recalculated — they power the response time and resolution time analytics without scanning messages.

> ⚠️ **SYSTEM DESIGN — `unreadCount` must use `FieldValue.increment()`, never be set directly:**
> If two inbound messages arrive simultaneously and both webhook handlers read `unreadCount = 0` then both write `unreadCount = 1`, you lose a count. `FieldValue.increment(1)` is an atomic server-side operation — concurrent calls cannot race. The same applies to resetting to zero: do it via a server route using a Firestore transaction, never a direct client write.

### 6.5 `types/message.ts`

```typescript
export interface Message {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  sender: 'contact' | 'agent' | 'ai'
  senderAgentId: string | null
  senderName: string
  body: string                    // Sanitised before storage
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template'
  mediaUrl: string | null         // Firebase Storage URL — NOT Twilio URL (see §15.4)
  mediaContentType: string | null
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  twilioSid: string | null
  externalId: string | null
  idempotencyKey: string          // UUID — prevents duplicate messages on retry
  aiSuggestion: AISuggestion | null
  aiSuggestionPending: boolean    // True while AI is generating — drives shimmer UI state
  isAiAutonomous: boolean
  sentAt: Timestamp
  createdAt: Timestamp
  schemaVersion: 1
}

export interface AISuggestion {
  body: string
  vendor: string
  model: string
  generatedAt: Timestamp
  approved: boolean
  approvedBy: string | null
  approvedAt: Timestamp | null
}
```

> ⚠️ **SYSTEM DESIGN — `idempotencyKey` prevents duplicate messages on Twilio retry:**
> Twilio retries webhook delivery if your endpoint doesn't respond within 15 seconds. Without idempotency protection, the same inbound message is processed twice: two Firestore documents, and in autonomous mode, two AI replies sent to the parent. Set an idempotency key on the `processedWebhooks` collection before doing any work. If the key already exists, return 200 immediately.
>
> ⚠️ **SYSTEM DESIGN — Never store Twilio media URLs:**
> Twilio media URLs expire. An agent opening a conversation days later sees a broken image. Download media during webhook processing, upload to Firebase Storage, store the Storage URL. It's a one-time cost at ingest time and the file is yours permanently.

> ⚠️ **SYSTEM DESIGN — Message subcollections have no archiving strategy by default:**
> A parent who has been with Bexley School since 2021 and messages once per term accumulates hundreds of messages in their conversation subcollection. After 3 years: ~300 messages. After 5 years: ~500 messages. `limitToLast(30)` protects the initial load, but the subcollection grows unbounded and every `count()` aggregation on it gets slower. Strategy: when a conversation is **resolved**, set a `resolvedAt` timestamp. After 12 months without activity, a Cloud Scheduler job moves the conversation to `archivedConversations/{id}` and its messages to `archivedConversations/{id}/messages/{id}`. These collections are never queried in real time — only via the contact history panel which uses one-time `getDocs()`. Active conversations stay lean; the archive is cheap cold storage that is queried rarely. Add this archiving job to Phase 7.

### 6.6 `types/ai.ts`

```typescript
export interface KnowledgeBaseEntry {
  id: string
  title: string
  content: string         // Max 500 chars recommended
  category: string
  priority: number        // 1 = highest — entries sorted by this when KB exceeds token budget
  isActive: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}

export interface CannedResponse {
  id: string
  shortcode: string       // No slash prefix in storage — normalised on save
  title: string
  body: string
  category: string
  usageCount: number      // Increment on use for analytics
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}
```

### 6.7 `types/channel.ts` — Channel Abstraction

```typescript
// ⚠️ SYSTEM DESIGN — Open/Closed Principle:
// The system is open to extension (add new channels) but closed to modification
// (adding WhatsApp does not change how Messenger or Instagram work).
// Any code that references a channel name string ('whatsapp') directly — outside
// this interface — is a violation of this principle and will require changes for
// every new channel added.

export interface InboundMessage {
  externalId: string          // Provider's message ID — used as idempotency key base
  channel: 'whatsapp' | 'messenger' | 'instagram'
  from: string
  fromName: string
  body: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  mediaUrl?: string
  mediaContentType?: string
  timestamp: Date
  rawPayload: unknown
}

export interface OutboundMessage {
  to: string
  body: string
  mediaUrl?: string
  idempotencyKey: string
}

export interface ChannelProvider {
  name: 'whatsapp' | 'messenger' | 'instagram'
  // ⚠️ Accepts string body not Request object — makes unit testing possible without mocking Web APIs
  parseInbound(body: string, headers: Record<string, string>): Promise<InboundMessage[]>
  sendMessage(msg: OutboundMessage): Promise<{ externalId: string }>
  verifyWebhook(body: string, headers: Record<string, string>): Promise<boolean>
}
```

### 6.8 `types/settings.ts`

```typescript
export interface GlobalSettings {
  id: 'global'
  aiVendor: 'claude' | 'openai' | 'gemini'
  aiModel: string
  aiSystemPrompt: string
  aiDebounceSeconds: number       // Seconds of inbound silence before AI fires (default: 60, min: 10, max: 300)
                                   // Replaces the old per-mode autoReplyDelay — applies to both suggest and auto-reply
  autoReplyMaxPerHour: number     // Per-conversation rate limit for autonomous mode
  businessName: string
  businessDescription: string
  defaultAssignment: 'round-robin' | 'manual' | null
  autoResolveAfterDays: number    // 0 = disabled
  businessHoursEnabled: boolean
  businessHoursStart: string      // HH:mm (24h)
  businessHoursEnd: string
  businessHoursTimezone: string   // IANA e.g. 'Africa/Harare'
  outOfHoursMessage: string
  updatedAt: Timestamp
  updatedBy: string
  schemaVersion: 1
}
```

### 6.9 `types/auditLog.ts`

```typescript
export type AuditAction =
  | 'message.sent' | 'message.ai_sent' | 'message.ai_suggested' | 'message.failed'
  | 'conversation.assigned' | 'conversation.resolved' | 'conversation.reopened'
  | 'conversation.snoozed' | 'conversation.ai_mode_enabled' | 'conversation.ai_mode_disabled'
  | 'contact.blocked' | 'contact.unblocked'
  | 'agent.created' | 'agent.deactivated' | 'agent.role_changed'
  | 'settings.updated'
  | 'knowledge_base.created' | 'knowledge_base.updated' | 'knowledge_base.deleted'
  | 'webhook.duplicate_rejected'

export interface AuditLog {
  id: string
  action: AuditAction
  agentId: string             // 'system' for autonomous AI actions
  agentName: string           // 'AI (Autonomous)' for autonomous actions
  conversationId: string | null
  messageId: string | null
  metadata: Record<string, unknown>
  createdAt: Timestamp
  // No schemaVersion — audit logs are immutable records, never migrated
}
```

---

## 7. Firebase Security Rules

> ⚠️ **SYSTEM DESIGN — Security rules are your last line of defence against client-side attacks:**
> Firebase Admin SDK (used in API routes) bypasses all security rules. Rules only protect direct client SDK calls from the browser. The risk: a malicious actor with your Firebase config (technically public — it's in your JS bundle) calling Firestore directly from their own code. Rules must assume the worst about the caller. Every `allow write` is a policy decision. The rules below are stricter than the original plan in several places — note the `isActive` check on agents and the explicit list of fields agents may update on conversations.

### `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAgent() {
      return request.auth != null
        && exists(/databases/$(database)/documents/agents/$(request.auth.uid))
        && get(/databases/$(database)/documents/agents/$(request.auth.uid)).data.isActive == true;
    }

    function isAdmin() {
      return isAgent()
        && get(/databases/$(database)/documents/agents/$(request.auth.uid)).data.role == 'admin';
    }

    match /agents/{agentId} {
      allow read: if isAgent();
      allow create: if false;
      allow update: if isAdmin()
        || (request.auth.uid == agentId
          && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['isOnline', 'lastSeenAt', 'updatedAt']));
      allow delete: if false;
    }

    match /conversations/{conversationId} {
      allow read: if isAgent();
      allow create: if false;   // Server-only via webhook
      allow update: if isAgent()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'assignedTo', 'assignedToName', 'tags',
                    'aiModeEnabled', 'aiModeEnabledAt', 'aiModeEnabledBy',
                    'snoozedUntil', 'updatedAt']);
      // ⚠️ unreadCount, lastMessage, lastMessageAt NOT allowed from client —
      // these are server-only to prevent race conditions.
      allow delete: if false;

      match /messages/{messageId} {
        allow read: if isAgent();
        allow create: if isAgent()
          && request.resource.data.direction == 'outbound'
          && request.resource.data.sender == 'agent'
          && request.resource.data.senderAgentId == request.auth.uid;
        allow update: if false;   // Messages are immutable
        allow delete: if false;
      }
    }

    match /contacts/{contactId} {
      allow read: if isAgent();
      allow create: if isAgent();
      allow update: if isAgent()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['displayName', 'tags', 'notes', 'isBlocked', 'updatedAt']);
      allow delete: if false;
    }

    match /knowledgeBase/{entryId} {
      allow read: if isAgent();
      allow write: if isAdmin();
    }

    match /cannedResponses/{responseId} {
      allow read: if isAgent();
      allow create: if isAgent();
      allow update: if isAgent()
        && (isAdmin() || resource.data.createdBy == request.auth.uid);
      allow delete: if isAdmin() || resource.data.createdBy == request.auth.uid;
    }

    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false;
    }

    match /settings/{settingId} {
      allow read: if isAgent();
      allow write: if isAdmin();
    }

    match /processedWebhooks/{key} {
      allow read, write: if false;  // Server Admin SDK only
    }
  }
}
```

---

## 8. Authentication Module

### 8.1 Behaviour
- Email/password login only
- After login, check `agents/{uid}` exists AND `isActive === true`
- Redirect to `/conversations` on success
- Logout: Firebase signOut + DELETE `/api/auth/session` + redirect to `/login`
- All `/(dashboard)/**` routes require valid session cookie

### 8.2 `middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/webhooks', '/api/auth']
// ⚠️ /api/webhooks must be public — Twilio cannot send session cookies
// ⚠️ /api/auth must be public — the verify route is called BY the middleware.
//    If /api/auth/verify were protected by this middleware, the middleware would
//    call /api/auth/verify, which would trigger the middleware again, which would
//    call /api/auth/verify, causing an infinite redirect loop.
//    All /api/auth/* routes are safe to keep public because they verify credentials
//    internally before returning any sensitive data.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('session')?.value
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ⚠️ SYSTEM DESIGN — Verify the cookie, not just its presence:
  // An expired, revoked, or forged cookie passes a presence-only check.
  // We call /api/auth/verify rather than importing firebase-admin directly
  // because Next.js middleware runs in the Edge runtime which does not support
  // Node.js crypto modules (required by firebase-admin).
  try {
    const res = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
      headers: { Cookie: `session=${sessionCookie}` },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) {
      const redirect = NextResponse.redirect(new URL('/login', request.url))
      redirect.cookies.delete('session')
      return redirect
    }
  } catch {
    // Verification service unavailable — fail open rather than lock everyone out
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
```

### 8.3 `app/api/auth/session/route.ts`

```typescript
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.idToken) return Response.json({ error: 'Missing idToken' }, { status: 400 })

  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(body.idToken)
  } catch {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }

  const agentDoc = await adminDb.collection(COLLECTIONS.AGENTS).doc(decoded.uid).get()
  if (!agentDoc.exists || !agentDoc.data()?.isActive) {
    return Response.json({ error: 'Not an authorised agent' }, { status: 403 })
  }

  const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
    expiresIn: 5 * 24 * 60 * 60 * 1000,
  })

  const response = Response.json({ ok: true })
  // ⚠️ HttpOnly: JS cannot read the cookie (XSS protection)
  // Secure: only sent over HTTPS
  // SameSite=Lax: prevents CSRF
  response.headers.set(
    'Set-Cookie',
    `session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${5 * 24 * 60 * 60}`
  )
  return response
}

export async function DELETE() {
  const response = Response.json({ ok: true })
  response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
  return response
}
```

### 8.4 `app/api/auth/verify/route.ts`

```typescript
// Lightweight — called by middleware on every protected route request
export async function GET(req: Request) {
  // ⚠️ SYSTEM DESIGN — Cookie values can contain '=' characters (base64 encoding).
  // Splitting on '=' and taking index [1] breaks for any base64 cookie value.
  // Firebase session cookies are base64-encoded JWTs which ALWAYS contain '='.
  // The correct pattern: split on '=' ONCE and join the rest back together,
  // OR use a proper cookie parser. The manual approach is shown below.
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='))
    ?.slice('session='.length)  // slice from after 'session=' — preserves '=' in value

  if (!sessionCookie) return Response.json({ valid: false }, { status: 401 })

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true) // true = check revocation
    return Response.json({ valid: true })
  } catch {
    return Response.json({ valid: false }, { status: 401 })
  }
}
```

### 8.5 `components/auth/LoginForm.tsx`

- Full-screen centered card, logo at top
- Email + password with show/hide toggle, `font-size: 16px` (prevents iOS zoom)
- Loading state during submit, disabled during submission
- Error messages: wrong credentials / not authorised / network error
- 5-second client-side cooldown after failed attempt
- On submit: `signInWithEmailAndPassword` → POST `/api/auth/session` → redirect

---

## 9. Core Layout & Navigation

### 9.1 Desktop: Fixed 240px sidebar, hidden on mobile (< 768px)

Navigation: Conversations, Contacts, Knowledge Base, Canned Responses, Analytics, Agents (admin), Settings, Audit Log (admin)

### 9.2 Mobile: Bottom nav bar, stacked full-screen pages

- `/conversations`: full-screen list
- `/conversations/[id]`: full-screen chat with back arrow
- Bottom nav hides when chat is open (Zustand `isChatOpen`)

### 9.3 `components/shared/ErrorBoundary.tsx`

> ⚠️ **SYSTEM DESIGN — Error boundaries contain failure to one component:**
> A React render error in `MessageBubble` caused by malformed data (e.g. a message with a null timestamp) will unmount the entire page without an error boundary. The agent sees a blank screen with no indication of what happened and cannot continue working. Wrap `ChatWindow`, `ConversationList`, and each settings page in an `ErrorBoundary` that renders a "Something went wrong — reload" card and reports to Sentry. The rest of the app stays functional.

```typescript
// Class component (required — hooks cannot catch render errors)
// On error: Sentry.captureException(error), render fallback card
// Show error details in development only
// Props: children, fallback (optional custom fallback UI)
```

---

## 10. Conversation List Module

### 10.0 Firestore Read Budget — Know Your Numbers

> ⚠️ **SYSTEM DESIGN — Know your read cost before writing a single listener:**
> Firestore charges per document read. Real-time `onSnapshot` listeners count reads differently from one-time `get()` calls: the initial load is a read-per-document, and every subsequent change to any document in the result set triggers another read-per-changed-document. Here is what this system generates at typical school volume:
>
> | Operation | Reads per event |
> |-----------|----------------|
> | Agent loads conversation list (50 convos) | 50 reads |
> | Every inbound message (updates conversation doc) | 1 read × number of agents watching the list |
> | Agent opens a conversation (100 messages) | 100 reads |
> | Twilio status callback (updates 1 message) | 1 read × number of agents with conversation open |
> | AI context fetch (10 messages) | 10 reads |
> | Analytics page load (uncached) | ~5 aggregation reads |
>
> **With 3 agents online and 20 messages/day:** ~(3×50) list loads + 20×3 message updates + 20×100 message opens = ~2,750 reads/day = ~82,500/month. Firestore free tier is 50,000 reads/day. This is within budget for a school. At 200 messages/day the numbers scale up proportionally. This is why the plan uses `limit(50)` on the list, `limitToLast(100)` on messages, and caches analytics.

### 10.1 Real-time vs. One-time Query Strategy

> ⚠️ **SYSTEM DESIGN — Not all tabs should use real-time listeners:**
> Real-time `onSnapshot` listeners are appropriate only where agents need live updates. Applying `onSnapshot` to every query — including "Resolved" and "All" tabs — wastes reads on data that rarely changes and that agents rarely watch. The rules:
>
> - **Open + Pending tabs:** Use `onSnapshot` — agents need to see new messages arrive and conversation status changes in real time.
> - **Resolved tab:** Use one-time `get()` with manual refresh button. Resolved conversations rarely change. An `onSnapshot` on 500 resolved conversations is 500 initial reads plus reads for every subsequent change.
> - **All tab:** Use one-time `get()` with pagination. This tab is for searching/auditing, not live monitoring.
>
> This reduces live listener cost by 60–80% for a typical school with more resolved than open conversations.

### 10.2 Real-time Query for Open/Pending

```typescript
// Active tabs only — onSnapshot
query(
  collection(db, COLLECTIONS.CONVERSATIONS),
  where('status', 'in', ['open', 'pending']),
  orderBy('lastMessageAt', 'desc'),
  limit(50)
)

// Resolved and All tabs — one-time get() + manual pagination
// Called only when tab is selected, not on every render
getDocs(query(
  collection(db, COLLECTIONS.CONVERSATIONS),
  where('status', '==', 'resolved'),
  orderBy('lastMessageAt', 'desc'),
  limit(50)
))
```

> ⚠️ **SYSTEM DESIGN — `limit(50)` without a continuation cursor silently drops conversations:**
> During school events (exam results, fee deadlines), conversation volume can spike. `limit(50)` with no pagination means conversations beyond the 50th are invisible to agents. Implement cursor pagination in `useConversations.ts`: store `lastVisible` (the last Firestore document from the previous page) and pass it to `startAfter()` for the next page. Show a "Load more" button when the previous page returned exactly 50 results.

### 10.3 `lib/hooks/useConversations.ts`

```typescript
// Returns: { conversations, loading, error, loadMore, hasMore }
// Real-time onSnapshot for first page of OPEN/PENDING tabs only
// One-time getDocs for RESOLVED and ALL tabs
// loadMore(): appends next 50 using startAfter(lastVisible) via getDocs (not onSnapshot)
// Cleans up all listeners on unmount
// On error: setError + Sentry.captureException

// IMPORTANT: Only subscribe to fields needed for the list view.
// Firestore does not support field-level projections in the client SDK —
// every onSnapshot delivers the full document. This is why the conversation
// document keeps its frequently-changing fields (lastMessage, unreadCount) and
// its rarely-changing fields (tags, notes, snoozedUntil) together:
// the list view needs all of them and cannot be further optimised at the query level.
```

### 10.4 `components/conversations/ConversationItem.tsx`

Per-row: avatar, contact name (bold if agent's own unread count > 0), last message snippet (60 chars), channel badge, relative timestamp, assigned agent avatar, AI mode robot icon, unread count badge showing `agentUnreadCounts[currentAgentUid]`

Use `React.memo` to prevent full list re-renders on every Firestore update. Compare by `conversation.updatedAt` timestamp — only re-render the row that actually changed.

---

## 11. Conversation Detail / Chat Module

### 11.1 `lib/hooks/useMessages.ts`

```typescript
// Returns: { messages, loading, error, loadOlder, hasOlder }
//
// INITIAL LOAD STRATEGY — two-phase:
// Phase 1 (instant): Read lastMessage snippet from the conversation document
//   already loaded by useConversations — zero extra reads, renders something immediately.
// Phase 2 (background): Load actual messages via onSnapshot.
//
// QUERY:
//   orderBy('sentAt', 'asc'), limitToLast(30)
//   — Start with 30, not 100. Most chat sessions only need the last 10–15 exchanges.
//   — 30 reads on open vs 100 saves 70 reads × every agent × every conversation opened.
//   — If the agent scrolls up: load more in batches of 30.
//
// REAL-TIME:
//   Use onSnapshot ONLY while the chat window is open (component mounted).
//   Clean up the listener immediately on unmount — not when the conversation is "closed".
//   An agent with 5 conversations visible as tabs has 5 live listeners.
//   Cap active simultaneous message listeners at 3 (the oldest tab pauses its listener).
//   On tab re-focus: resume listener from where it left off using startAfter(lastKnownMessage).
//
// LOAD OLDER MESSAGES:
//   endBefore(firstVisible) + limitToLast(30) — NOT startBefore (does not exist)
//   Preserve scroll position: record scrollHeight before insert,
//   set scrollTop = newScrollHeight - oldScrollHeight after insert.
//
// STATUS UPDATES:
//   Do NOT use onSnapshot for message status updates (delivered/read ticks).
//   These arrive via the Twilio status callback which updates Firestore server-side.
//   The onSnapshot listener already picks them up as part of the normal message stream.
//   No separate listener needed.
//
// Does NOT update unreadCount — calls server route to do so atomically.
```

> ⚠️ **SYSTEM DESIGN — Start with `limitToLast(30)` not 100:**
> The original plan specified `limitToLast(100)`. Loading 100 messages costs 100 reads every time an agent opens a conversation, even if they only need to see the last 5 messages to answer a question. At 20 conversation opens per day with 3 agents, that is 6,000 reads/day just for opening conversations — before any other operations. Starting with 30 and loading more on demand keeps this to 1,800 reads/day. Agents who need context scroll up; agents who just need to reply don't pay for the history they never read.

> ⚠️ **SYSTEM DESIGN — Cap simultaneous real-time message listeners at 3:**
> Each `onSnapshot` on a messages subcollection holds an open WebSocket connection to Firestore. Browser tab memory and connection limits mean more than 3–4 active message listeners degrades performance noticeably on mobile. Track open chat panels in Zustand. When a 4th panel would open, pause the oldest listener. Resume it when that tab is focused. This is a progressive enhancement — implement it in Phase 3, not Phase 2.

> ⚠️ **SYSTEM DESIGN — `startBefore` does not exist in Firestore — use `endBefore` + `limitToLast`:**
> To get 30 messages BEFORE the oldest currently loaded: `query(..., orderBy('sentAt', 'asc'), endBefore(firstVisible), limitToLast(30))`. Using `startBefore` will compile (TypeScript won't catch it) but returns wrong results. Additionally, inserting DOM nodes at the top of a scroll container resets `scrollTop` to 0. Always record `scrollHeight` before the insert and restore it after.

### 11.2 `components/chat/ChatWindow.tsx`

```
┌─────────────────────────────┐
│  TopBar (contact + actions) │  fixed, h-14
├─────────────────────────────┤
│   Message bubbles           │  flex-1, overflow-y-auto
├─────────────────────────────┤
│  AISuggestionBar            │  animated slide-up, only when suggestion exists
├─────────────────────────────┤
│  MessageInput               │  auto-growing, 1–5 rows
└─────────────────────────────┘
```

> ⚠️ **SYSTEM DESIGN — Use `h-[100dvh]` not `h-screen` for mobile:**
> `h-screen` = `100vh`. On mobile browsers, `100vh` includes the address bar. When the keyboard opens, the address bar shrinks and `100vh` is taller than the visible area, pushing the message input offscreen. `100dvh` (dynamic viewport height) recalculates when the keyboard opens. This is one of the most common mobile web chat UI bugs.

> ⚠️ **SYSTEM DESIGN — Never update `unreadCount` from the client:**
> Two agents with the same conversation open simultaneously can race: both read `3`, both write `0`. With `FieldValue.increment(-unreadCount)` server-side in a transaction, the reset is atomic. The client must call the server to reset, not write directly.

### 11.3 `components/chat/MessageBubble.tsx`

- **Inbound (contact):** Left-aligned, grey background, contact name, timestamp
- **Outbound (agent) — confirmed:** Right-aligned, brand colour, agent name + avatar, delivery status icon (✓ sent, ✓✓ delivered, ✓✓ read in blue)
- **Outbound (agent) — optimistic `status: 'sending'`:** Same styling as confirmed but with a **clock icon ⏱** instead of a tick. Opacity 0.8 to signal "in flight". This state lives only in Zustand — it never exists in Firestore.
- **Outbound (agent) — `status: 'failed'`:** Red tint on bubble, ⚠ icon, "Failed — tap to retry" text below. Tapping retry calls `/api/messages/send` with the same `idempotencyKey` — safe to repeat because idempotency deduplicates on the server.
- **Outbound (AI autonomous):** Right-aligned, **distinct indigo background**, robot icon + "AI" label — always visually distinct
- **Media:** Image thumbnail (tap to expand), document icon + download, HTML5 audio player

> ⚠️ **SYSTEM DESIGN — The optimistic and confirmed bubbles must never both appear simultaneously:**
> When `onSnapshot` delivers the server-confirmed message, `useMessages` matches it by `id` against the optimistic list and removes the optimistic entry in the same state update. If this deduplication is missing, the agent sees two copies of their message briefly — the fading optimistic one and the new real one. The match key is the client-generated `messageId` UUID, which is used as both the optimistic entry's `id` and the Firestore document ID.

### 11.4 `components/chat/MessageInput.tsx`

```
┌──────────────────────────────────────────────────────┐
│ [⚡] [/] [📎]  Type a message...          [🤖] [▶]  │
└──────────────────────────────────────────────────────┘
```

- **[⚡] Quick Replies**: toggles `QuickRepliesPanel` open/closed. On mobile: opens slide-up drawer
- `font-size: 16px` — prevents iOS zoom on focus
- `/` prefix triggers `CannedResponsePicker` (library browse + insert mode)
- 📎 attachment: validates type + size (max 16MB, image/pdf/audio/video only) before upload
- 🤖 manually trigger AI suggestion + quick options
- Mobile: Enter = new line, send button only; Desktop: Shift+Enter = new line, Enter = send
- Disabled with "AI mode is active" banner when autonomous mode is on

> ⚠️ **SYSTEM DESIGN — Validate file uploads before starting the upload:**
> Without pre-upload validation, an agent can accidentally upload a 500MB video to Firebase Storage, exhausting the free storage quota in one action. Enforce max 16MB and allowed MIME types client-side before calling `uploadBytes()`.

### 11.5 `components/chat/AISuggestionBar.tsx` (Updated — includes quick options)

```
┌────────────────────────────────────────────────────────┐
│ 🤖 AI Suggestions:                          [Claude]   │
│                                                        │
│ [✓ Yes, open Friday]  [✓ Pay via EcoCash]  [✓ Call us]│
│                                                        │
│  Detailed: "The school will be open Friday the 25th.   │
│  Fees can be paid via EcoCash or bank transfer..."     │
│                             [Edit] [Regenerate] [Send] │
└────────────────────────────────────────────────────────┘
```

**Rendering states — the bar has four distinct states:**

1. **`aiSuggestionPending: true` and `aiSuggestion: null`** → show shimmer/skeleton (grey animated bars). Message: "AI is preparing a suggestion..." This appears when the agent opens the conversation within the 2–8 seconds the AI is still running.

2. **`aiSuggestionPending: false` and `aiSuggestion: null`** → bar is hidden. AI failed or was not triggered. The 🤖 button in MessageInput is enabled so the agent can request on demand.

3. **`aiSuggestion` is populated but `isStale() === true`** → muted/greyed bar with message "Suggestion is outdated — [Regenerate]". Shown when suggestion is > 2 hours old OR new messages arrived after it was generated.

4. **`aiSuggestion` is populated and fresh** → full suggestion bar rendered as below.

- **Quick option buttons** (1–6 words each): tap to send immediately — same as Quick Reply [▶ Send]
- **[Send]**: sends the full detailed suggestion
- **[Edit]**: copies detailed suggestion into MessageInput for editing
- **[Regenerate]**: re-calls ai-suggest for the most recent inbound message, replaces all suggestions
- **[Dismiss]**: clears all suggestions; sets `conversation.lastAiSuggestionMessageId = null`
- Quick options are generated in the same AI call as the detailed suggestion — no extra API cost (see §20.3)
- If AI returns no quick options (complex question with no short answer), only the detailed suggestion is shown
- Swipe left on mobile to dismiss entire bar
- Animated slide-up entry
- On agent send (any method): clear `conversation.lastAiSuggestionMessageId = null`

### 11.6 `components/chat/AIModeToggle.tsx`

- Visible in TopBar for current conversation
- ON: green/indigo, OFF: grey
- Turning ON: shows confirmation bottom sheet explaining autonomous mode
- Turning OFF: immediate, no confirmation
- Writes Firestore + audit log on every toggle

> ⚠️ **SYSTEM DESIGN — Zustand mirrors Firestore, it does not replace it:**
> The Zustand store provides immediate UI feedback (no spinner while Firestore writes). But Firestore is always the source of truth. On toggle: write to Firestore first, update Zustand only on success. On mount: read from Firestore, sync to Zustand. Never assume Zustand is current after a page refresh.

### 11.7 Conversation Actions

- **Assign**: updates conversation doc, writes audit log
- **Resolve / Reopen**: sets status, toast confirmation
- **Snooze**: time picker (15min/1hr/4hr/tomorrow), sets `snoozedUntil`
- **Add Tag**: multi-select + free-form

> ⚠️ **SYSTEM DESIGN — Snoozed conversation reopening requires a scheduled server job:**
> Client-side checks are unreliable — the app may not be open when the snooze expires. Use Firebase Cloud Scheduler (via Cloud Functions `pubsub.schedule`) to query `status == 'snoozed' && snoozedUntil <= now` every 15 minutes and set `status = 'open'`. This is added to Phase 7.
>
> **Cloud Scheduler job specification (`functions/src/snoozedConversations.ts`):**
> ```typescript
> // Runs every 15 minutes via: functions.pubsub.schedule('every 15 minutes')
> // Query: collection('conversations')
> //   .where('status', '==', 'snoozed')
> //   .where('snoozedUntil', '<=', Timestamp.now())
> //   .limit(100)   // Process max 100 at a time — run will be triggered again in 15min for more
> // For each: update { status: 'open', snoozedUntil: null, updatedAt: serverTimestamp() }
> // Write audit log: { action: 'conversation.reopened', agentId: 'system', metadata: { reason: 'snooze_expired' } }
> // On error: log to Sentry, do NOT throw — a failed run retries on next schedule
> // Idempotent: updating an already-open conversation to 'open' is harmless
> ```

---

## 12. AI Reply Module

### 12.1 The Core Design: Debounced AI Generation

**Every AI call — both assisted suggestions and autonomous replies — is debounced by 60 seconds of inbound silence.**

This means: when a message arrives, the AI does NOT fire immediately. A 60-second countdown starts. If another message arrives before the countdown finishes, the countdown resets to 60 seconds. Only after 60 full seconds of silence does the AI run once, using all accumulated messages as context.

**Why this matters:**

Parents commonly send messages in bursts — three quick messages in a row:
```
"Hi"
"Quick question about fees"
"Are they due this week or next?"
```

Without debouncing, the current plan fires three separate AI calls:
- AI call 1: reads "Hi" → generates "Hello! How can I help?" (useless)
- AI call 2: reads "Hi" + "Quick question about fees" → generates "Sure, what's your question?" (premature)
- AI call 3: reads all three → generates the actually useful fee reply

**Result: 3x token cost for 2 wasted calls, plus two stale suggestions that confuse the agent.**

With debouncing:
- Message 1 arrives → 60s timer starts
- Message 2 arrives at T+5s → timer resets to 60s
- Message 3 arrives at T+8s → timer resets to 60s
- 60 seconds of silence → AI fires once with all 3 messages in context → one good reply

**The debounce also applies to autonomous mode.** A parent sending 3 messages should receive one thoughtful reply, not three AI responses in rapid succession.

---

### 12.2 Why You Cannot Debounce in Serverless Memory

> ⚠️ **SYSTEM DESIGN — Serverless functions have no shared memory between invocations — you cannot debounce with setTimeout across webhook calls:**
> The instinctive implementation is: `if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(runAI, 60000)`. This works in a long-running Node server. It does not work in Next.js API routes. Each webhook invocation is a separate function instance — potentially on a separate container. Setting `debounceTimer` in one instance is invisible to the next. Two consecutive messages could land on two different containers. The timer from the first is orphaned and fires 60 seconds later anyway.
>
> **The correct debounce mechanism in stateless serverless is Firestore.** Use a `pendingAiRequests` document as a shared, durable timer that all serverless instances can read and update atomically.

---

### 12.3 The Firestore Debounce Pattern

**`pendingAiRequests/{conversationId}`** — one document per conversation, upserted on every inbound message:

```typescript
// types/pendingAiRequest.ts
export interface PendingAiRequest {
  conversationId: string
  executeAt: Timestamp            // Now + 60 seconds — reset on every new message
  latestMessageId: string         // The most recent inbound message to use as anchor
  mode: 'suggest' | 'auto-reply' // Which flow to run when timer fires
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**On every inbound message (Step 11 in the webhook handler):**

```typescript
// Step 11: Upsert the pending AI request — reset the debounce timer
const executeAt = new Date(Date.now() + 60_000)  // 60 seconds from now
const mode = (conversation.aiModeEnabled && !contact.isBlocked) ? 'auto-reply' : 'suggest'

await adminDb
  .collection(COLLECTIONS.PENDING_AI_REQUESTS)
  .doc(conversation.id)
  .set({
    conversationId: conversation.id,
    executeAt: Timestamp.fromDate(executeAt),
    latestMessageId: messageRef.id,
    mode,
    updatedAt: FieldValue.serverTimestamp(),
    // Only set createdAt if the doc doesn't exist yet
  }, { merge: true })

// ⚠️ Do NOT set aiSuggestionPending: true here.
// The shimmer would flicker on every message during a burst.
// Set aiSuggestionPending: true only when the debounce fires and the AI actually starts.
```

> ⚠️ **SYSTEM DESIGN — `set(..., { merge: true })` is the correct upsert for debouncing:**
> `set()` without merge creates or overwrites. `update()` fails if the document doesn't exist. `set(..., { merge: true })` creates if missing, updates if present — exactly what debouncing needs. The `executeAt` field is always overwritten to `now + 60s` regardless of whether this is the first or fifth message in a burst.

---

### 12.4 The Cloud Scheduler Job — Debounce Processor

A Cloud Scheduler job runs every 30 seconds. It queries `pendingAiRequests` for documents where `executeAt <= now`, processes them, then deletes them.

```typescript
// functions/src/processAiRequests.ts
// Runs every 30 seconds via: functions.pubsub.schedule('every 1 minutes').onRun(...)
// (Cloud Scheduler minimum is 1 minute — run every minute, process anything due)

// Query:
const due = await adminDb
  .collection(COLLECTIONS.PENDING_AI_REQUESTS)
  .where('executeAt', '<=', Timestamp.now())
  .limit(20)
  .get()

for (const doc of due.docs) {
  const request = doc.data() as PendingAiRequest
  
  try {
    // Mark the message as pending BEFORE starting the AI call
    // Only now does the shimmer appear in the agent's UI
    await adminDb
      .collection(COLLECTIONS.MESSAGES(request.conversationId))
      .doc(request.latestMessageId)
      .update({ aiSuggestionPending: true })

    if (request.mode === 'auto-reply') {
      await fetch(`${env.APP_URL}/api/ai/auto-reply`, {
        method: 'POST',
        headers: { 'x-webhook-secret': env.WEBHOOK_SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: request.conversationId,
          triggeringMessageId: request.latestMessageId,
        }),
        signal: AbortSignal.timeout(30_000),
      })
    } else {
      await fetch(`${env.APP_URL}/api/messages/ai-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: request.conversationId,
          messageId: request.latestMessageId,
        }),
        signal: AbortSignal.timeout(30_000),
      })
    }
  } catch (err) {
    logger.error({ err, conversationId: request.conversationId }, 'AI request processing failed')
    // Clear the pending flag so the shimmer disappears
    await adminDb
      .collection(COLLECTIONS.MESSAGES(request.conversationId))
      .doc(request.latestMessageId)
      .update({ aiSuggestionPending: false })
      .catch(() => {})
  } finally {
    // Always delete the processed request — even on failure
    // On failure the agent can tap 🤖 to retry manually
    await doc.ref.delete()
  }
}
```

> ⚠️ **SYSTEM DESIGN — The scheduler runs every minute (Cloud Scheduler minimum) but the debounce is 60 seconds:**
> This means the maximum actual wait is up to 120 seconds (60s debounce + up to 60s until the next scheduler run). For a school inbox this is acceptable — the agent is usually not watching the conversation in real time. If sub-minute precision matters, use a Cloud Tasks queue instead of Cloud Scheduler: Cloud Tasks supports arbitrary delay scheduling and fires at the exact requested time. For now, the 60-second debounce + minute-interval scheduler is simpler and sufficient.

> ⚠️ **SYSTEM DESIGN — The debounce document must be in a root collection, not under conversations:**
> `pendingAiRequests/{conversationId}` is a root collection keyed by `conversationId`. This gives it a Firestore path that can be queried with a simple `where('executeAt', '<=', now)` across all conversations in one query. If it were a subcollection (`conversations/{id}/pendingAiRequest/{id}`), the scheduler would need to query every conversation's subcollection separately — impossible without knowing which conversations have pending requests.

---

### 12.5 The `pendingAiRequests` Collection and Cleanup

```typescript
// Add to lib/firebase/collections.ts:
PENDING_AI_REQUESTS: 'pendingAiRequests',
```

**TTL policy:** Add a TTL policy on `pendingAiRequests` with `expireAt = executeAt + 24 hours`. If the scheduler fails to process a request (Cloud Scheduler outage), the document auto-expires after 24 hours rather than accumulating forever. A parent whose message wasn't processed will see no suggestion — they can trigger one manually via the 🤖 button.

**Index required:**
```json
{
  "collectionGroup": "pendingAiRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "executeAt", "order": "ASCENDING" }
  ]
}
```

---

### 12.6 Updated Webhook Step 11 — No Direct AI Calls

The webhook no longer directly calls `/api/messages/ai-suggest` or `/api/ai/auto-reply`. It only upserts the `pendingAiRequests` document. This is a much simpler webhook handler — it no longer needs to await any AI work within the 15-second Twilio window.

```typescript
// Step 11: Upsert debounce record — the ONLY thing the webhook does for AI
const executeAt = new Date(Date.now() + 60_000)
await adminDb.collection(COLLECTIONS.PENDING_AI_REQUESTS).doc(conversation.id).set({
  conversationId: conversation.id,
  executeAt: Timestamp.fromDate(executeAt),
  latestMessageId: messageRef.id,
  mode: (conversation.aiModeEnabled && !contact.isBlocked) ? 'auto-reply' : 'suggest',
  updatedAt: FieldValue.serverTimestamp(),
  createdAt: FieldValue.serverTimestamp(),  // Only applied on create due to merge
}, { merge: true })

// Done. No await on AI. No timeout risk. Respond to Twilio immediately.
logger.info({ latencyMs: Date.now() - startMs, conversationId: conversation.id }, 'Webhook processed')
return twimlResponse
```

> ⚠️ **SYSTEM DESIGN — Removing the direct AI call from the webhook handler makes it dramatically more reliable:**
> The original webhook had a 12-second await on the auto-reply route and an 8-second await on the suggestion route. Both ate into the 15-second Twilio window. A slow AI vendor or a Firestore read spike could push the handler over the limit, triggering a Twilio retry, which would then hit the webhook again and potentially create a duplicate `pendingAiRequests` upsert (harmless — it just resets the timer). Now the webhook does: verify → save message → update conversation counters → upsert debounce doc → respond. All fast Firestore writes. The AI work is entirely decoupled.

---

### 12.7 Updated Full Timeline (with debounce)

```
8:47:00 — Parent sends "Hi"
8:47:00 — Webhook: saves message, upserts pendingAiRequest { executeAt: 8:48:00 }

8:47:05 — Parent sends "Quick question about fees"
8:47:05 — Webhook: saves message, UPDATES pendingAiRequest { executeAt: 8:48:05, latestMessageId: msg2 }

8:47:08 — Parent sends "Are they due this week or next?"
8:47:08 — Webhook: saves message, UPDATES pendingAiRequest { executeAt: 8:48:08, latestMessageId: msg3 }

[60 seconds of silence]

8:49:08 — Cloud Scheduler fires (next minute boundary)
8:49:08 — Scheduler finds: pendingAiRequest for this conversation, executeAt <= now
8:49:08 — Scheduler sets message msg3.aiSuggestionPending = true (shimmer appears if agent is watching)
8:49:08 — Scheduler calls /api/messages/ai-suggest with messageId = msg3
8:49:10 — AI fetches last 10 messages — sees all three of the parent's messages as context
8:49:12 — AI generates reply addressing all three messages
8:49:12 — Suggestion written to msg3.aiSuggestion, aiSuggestionPending = false
8:49:12 — conversation.lastAiSuggestionMessageId = msg3.id
8:49:12 — Scheduler deletes pendingAiRequest document

[Agent opens chat any time after 8:49:12]
           AISuggestionBar renders with the suggestion — based on all three messages
```

---

### 12.8 The Answer to: "Is the suggestion ready when I open the app?"

**Yes — but not instantly on message receipt like before. It is ready 60+ seconds after the last message in the burst.** For a school inbox where agents typically check messages every few minutes or hours, this is invisible — the suggestion is always ready well before the agent opens the chat. The only scenario where an agent sees a shimmer is if they open the chat within 60 seconds of the parent's last message, which is unusual behaviour for this use case (if they're that fast, they can just type a reply themselves).

**For the autonomous mode case:** the parent receives one reply, not three — and it addresses all their questions at once, which is higher quality.

### 12.9 Configurable Debounce Window

The 60-second debounce window is stored in `settings/global.aiDebounceSeconds` (default: 60, range: 10–300). Admins can reduce it to 10 seconds for a busy inbox where parents rarely send follow-up messages, or increase it to 120 seconds for a slower-paced context. The webhook always reads from the current settings value when computing `executeAt`.

> ⚠️ **SYSTEM DESIGN — Do not allow the debounce window to be set to 0:**
> A 0-second debounce means every single message fires an AI call immediately — the original broken behaviour. The minimum in the UI should be 10 seconds. At 10 seconds, a parent who sends three messages within 10 seconds of each other still benefits from the batching.

### 12.10 Problem: Agent-triggered Suggestions Bypass Debounce

When the agent taps the 🤖 button manually (Problem 3 from §12.4), they want a suggestion right now — not in 60 seconds. This call goes directly to `/api/messages/ai-suggest` without going through the debounce queue. This is intentional: the agent is explicitly requesting a suggestion, so there is no ambiguity about whether more messages are coming.

The 🤖 button also cancels any existing `pendingAiRequest` for this conversation by deleting the document, so the scheduler does not generate a second suggestion on top of the manually-requested one.

### 12.2 Outbound Message Creation — Optimistic UI + Server Sync

**The question: when does the message appear in the chat — on DB write or on screen load?**

**The current plan has it wrong.** Step 6 creates the message doc server-side. The bubble only appears after the round trip: tap → request → server → Firestore write → `onSnapshot` → render. On a 300ms mobile connection that is a 600–800ms delay between tapping Send and seeing your own message. Every modern messaging app (WhatsApp, iMessage, Telegram) shows your message instantly. The plan must use **optimistic UI**.

**Correct pattern — three-phase:**

```
Phase 1 — Instant (0ms, on tap):
  Generate a client-side UUID as messageId + idempotencyKey
  Create a local message object with status: 'sending'
  Add to the local messages array in useMessages state (NOT to Firestore yet)
  Message bubble appears immediately — agent sees their reply without delay

Phase 2 — Background (~100–400ms, async):
  POST /api/messages/send with the messageId and idempotencyKey
  Server validates, writes to Firestore, sends via Twilio
  Server returns { ok: true, twilioSid }

Phase 3 — Confirm (~100ms after Phase 2):
  onSnapshot fires — Firestore document now exists with status: 'sent'
  Local optimistic message is replaced by the real Firestore document
  Delivery status tick appears (single tick = sent)
```

**What the agent sees:**
- Tap Send → message bubble appears instantly with a clock/spinner icon
- ~400ms later → clock icon changes to a single tick (sent to Twilio)
- ~2–10s later → double tick (delivered to contact's phone), via status callback

**On failure:**
- If POST returns an error → message bubble changes to red "Failed — retry" indicator
- The local optimistic message is NOT removed — the agent can see what they tried to send
- Tap Retry → same idempotencyKey is reused → server deduplicates if the first attempt actually went through silently

### 12.3 `lib/hooks/useMessages.ts` — Optimistic State

```typescript
// The hook maintains TWO lists:
// 1. optimisticMessages: Message[] — client-generated, status: 'sending' or 'failed'
// 2. confirmedMessages: Message[] — from Firestore onSnapshot
//
// The rendered list is: [...confirmedMessages, ...optimisticMessages]
//   sorted by sentAt (optimistic messages use Date.now() as sentAt)
//
// When onSnapshot returns a message whose id matches an optimistic message:
//   Remove the optimistic message from optimisticMessages
//   The confirmed version from Firestore replaces it
//   (avoids the message appearing twice during the brief overlap)
//
// addOptimisticMessage(msg: OptimisticMessage): void
//   Called immediately on Send tap — adds to optimisticMessages
//
// confirmMessage(id: string): void
//   Called when onSnapshot delivers the server version — removes from optimisticMessages
//
// failMessage(id: string): void
//   Called when the POST returns an error — sets optimistic message status to 'failed'
```

> ⚠️ **SYSTEM DESIGN — Optimistic UI is not a shortcut, it is a correctness requirement:**
> The alternative — waiting for the server round trip before showing the message — produces a chat that *feels* broken compared to WhatsApp. For a school admin on a phone in Harare on a mobile connection, 600ms of silence after tapping Send is long enough to tap Send again, causing a duplicate. Optimistic UI eliminates both the perceived lag and the double-tap problem because the button is disabled immediately on first tap (the optimistic message is visible, the input clears).

> ⚠️ **SYSTEM DESIGN — The optimistic message and the Firestore document must share the same `id`:**
> The client generates the UUID before calling the server. The server uses that UUID as the Firestore document ID (passed in the request body). When `onSnapshot` returns the confirmed document, the hook matches it by `id` and removes the optimistic copy. If the server generates its own ID, there is no way to match the optimistic and confirmed versions without a secondary lookup.

> ⚠️ **SYSTEM DESIGN — Clear the input immediately on tap, not on server confirmation:**
> Clearing the input after server confirmation means the agent sees their typed text for 400ms after tapping Send, which feels wrong. Clear the input and add the optimistic message simultaneously — both happen in the same synchronous React state update, so the render is atomic. The agent sees: input clears + message appears in chat, in the same frame.

### 12.4 `app/api/messages/send/route.ts`

```typescript
// Body (Zod validated):
// {
//   messageId: z.string().uuid(),      // Client-generated — used as Firestore doc ID
//   conversationId: z.string().uuid(),
//   body: z.string().min(1).max(4096).trim(),
//   type?: MessageType,
//   mediaUrl?: z.string().url().optional(),
//   idempotencyKey: z.string().uuid(), // Same as messageId — client generates both
//   isAiApproved?: boolean,
//   aiSuggestionMessageId?: string,
//   sentAt: z.string().datetime(),     // Client timestamp — used as the message's sentAt
// }

// Steps:
// 1. Verify session
// 2. Validate body with Zod (return 400 on failure)
// 3. Check idempotency: try adminDb.collection(PROCESSED_WEBHOOKS).doc(idempotencyKey).create(...)
//    If ALREADY_EXISTS: return the original messageId and twilioSid — safe repeat response
// 4. Fetch conversation — verify status === 'open' (return 422 if not)
// 5. Sanitise body
// 6. In a Firestore TRANSACTION:
//    a. Write message doc using the client-provided messageId as the document ID
//       { id: messageId, status: 'sent', sentAt: Timestamp.fromDate(new Date(sentAt)), ...rest }
//    b. Write idempotency record
//    (transaction ensures both happen or neither does)
// 7. After transaction: send via channel provider
// 8. On send success: update message { twilioSid, externalId }
//    Update conversation { lastMessage, lastMessageAt, messageCount: increment(1),
//                          firstResponseAt (if null) }
// 9. On send failure: update message { status: 'failed' }, write audit log 'message.failed'
// 10. Write audit log 'message.sent' on success
// 11. Return { ok: true, messageId, twilioSid }
//
// ⚠️ The message doc is written with status: 'sent' in step 6, not 'sending'.
// 'sending' is a client-only state for the optimistic message — it never touches Firestore.
// Firestore only ever stores 'sent', 'delivered', 'read', or 'failed'.
// This keeps the DB clean and avoids a second write just to update 'sending' → 'sent'.
```

> ⚠️ **SYSTEM DESIGN — `sentAt` comes from the client, not `serverTimestamp()`:**
> Using `FieldValue.serverTimestamp()` for `sentAt` means the timestamp is set when the server writes to Firestore, which can be 200–500ms after the agent actually tapped Send. This pushes messages slightly into the future relative to the agent's clock. For ordering purposes it is fine, but for display ("sent 2 minutes ago") it causes a subtle inconsistency. Using the client timestamp (passed in the request body) means the message is dated when the agent intended to send it. The client timestamp should be validated to be within 60 seconds of `Date.now()` server-side to prevent timestamp manipulation.

---

## 13. AI Autonomous Mode

### 13.1 Flow

```
Inbound message saved
       ↓
Webhook checks: aiModeEnabled AND !contact.isBlocked
       ↓ (if enabled)
POST /api/ai/auto-reply (awaited with 12s timeout — within Twilio's 15s window)
       ↓
auto-reply:
  1. Verify WEBHOOK_SECRET with constant-time comparison
  2. Re-fetch conversation — confirm aiModeEnabled still true
  3. Check contact.isBlocked
  4. Check processing sentinel (prevents concurrent duplicate replies)
  5. Check rate limit
  6. Check business hours
  7. Write processing sentinel
  8. Call AI with 10s timeout
  9. Send via channel provider
  10. Save message { sender: 'ai', isAiAutonomous: true }
  11. Delete processing sentinel
  12. Write audit log { action: 'message.ai_sent', agentId: 'system' }
```

> ⚠️ **SYSTEM DESIGN — Do NOT use fire-and-forget fetch() for auto-reply:**
> The original plan used `fetch(...).catch(console.error)` without `await` — "fire-and-forget". In a Next.js serverless function, the process can be terminated immediately after the main handler returns. If the handler returns before the unawaited fetch completes, the auto-reply is silently lost. The parent receives no response. `await` the fetch with a short timeout (12s) so it completes within Twilio's 15-second window.
>
> ⚠️ **SYSTEM DESIGN — The processing sentinel prevents concurrent duplicate auto-replies:**
> Twilio retries cause two simultaneous `/api/ai/auto-reply` calls for the same conversation. Both pass the rate limit check (neither has sent yet), both call the AI, both send a reply — the parent receives two near-identical AI messages. Write `conversations/{id}/meta/aiProcessing = { startedAt: serverTimestamp() }` before calling the AI. Check for it at the start and abort if it exists and is under 30 seconds old. Delete it after sending.
>
> ⚠️ **SYSTEM DESIGN — `setTimeout` for `autoReplyDelay` does NOT work in serverless — replaced by Firestore debounce:**
> The old plan had an `autoReplyDelay` setting and suggested using `setTimeout` inside the auto-reply route. Both are wrong for serverless. The correct debounce mechanism is the `pendingAiRequests` Firestore collection + Cloud Scheduler processor documented in §12.2–12.5. The `autoReplyDelay` setting has been replaced by `aiDebounceSeconds` which applies uniformly to both AI suggestions and autonomous replies. See §12 for the full debounce design.

### 13.2 Rate Limiter

```typescript
// lib/ai/rateLimiter.ts
// Count messages where isAiAutonomous=true AND sentAt >= now-1hour
// Uses Firestore count() aggregation — no document downloads

// ⚠️ SYSTEM DESIGN — Rate limiting prevents runaway AI spend:
// A confused or automated sender sending 100 messages/hour triggers 100 AI calls
// and 100 Twilio sends. At Haiku rates that's ~$0.40/hr in AI costs alone, plus
// Twilio message fees. A per-conversation hourly limit (e.g. 10) caps this.
// A global kill switch (feature flag aiAutonomousModeEnabled = false) stops all
// autonomous replies instantly without a code deploy.
```

---

## 14. Multi-Vendor AI Integration

### 14.1 Strategy Pattern — `lib/ai/index.ts`

```typescript
// ⚠️ SYSTEM DESIGN — Strategy Pattern:
// Each vendor is a concrete strategy implementing the same AIClient interface.
// Calling code depends only on the interface — it has zero knowledge of which
// vendor it calls. Switching vendors is one config change. A/B testing vendors
// is possible by routing conversations to different vendors via settings.

export interface AIClient {
  suggest(params: {
    systemPrompt: string
    messages: { role: 'user' | 'assistant'; content: string }[]
    model?: string
    maxTokens?: number
    signal?: AbortSignal   // Required — every call must be cancellable
  }): Promise<string>
}

export function getAIClient(vendor?: string): AIClient {
  const v = vendor ?? env.AI_VENDOR
  switch (v) {
    case 'claude': return new ClaudeClient()
    case 'openai': return new OpenAIClient()
    case 'gemini': return new GeminiClient()
    default: throw new Error(`Unknown AI vendor: ${v}`)
  }
}
```

### 14.2 `lib/ai/claude.ts`

```typescript
export class ClaudeClient implements AIClient {
  // ⚠️ Class-level singleton — instantiating per-request creates new connection pools,
  // exhausting file descriptors under load. One instance reuses the pool.
  private client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  private defaultModel = env.AI_MODEL ?? 'claude-haiku-4-5-20251001'

  async suggest({ systemPrompt, messages, model, maxTokens = 300, signal }) {
    const startMs = Date.now()
    try {
      const res = await this.client.messages.create(
        { model: model ?? this.defaultModel, max_tokens: maxTokens, system: systemPrompt, messages },
        { signal }
      )
      logger.info({ vendor: 'claude', latencyMs: Date.now() - startMs }, 'AI call success')
      return res.content[0].type === 'text' ? res.content[0].text : ''
    } catch (err) {
      logger.error({ vendor: 'claude', latencyMs: Date.now() - startMs, err }, 'AI call failed')
      throw err
    }
  }
}
```

### 14.3 `lib/ai/prompts.ts`

```typescript
export function buildSuggestionPrompt(ctx: PromptContext): string {
  const kbText = buildKnowledgeBaseSection(ctx.knowledgeBaseEntries, ctx.tokenBudget)

  return `You are a helpful customer service assistant for ${ctx.businessName}.
${ctx.businessDescription ? `About: ${ctx.businessDescription}` : ''}
${ctx.customSystemPrompt}

## Knowledge Base
${kbText}

## Instructions
- Respond in the same language as the customer
- Be concise and friendly (under 3 sentences)
- If unsure, say so and offer to have a human follow up
- Never fabricate facts — use only the knowledge base above
- No disclaimers or sign-offs
Customer: ${ctx.contact.displayName}`.trim()
}

// ⚠️ SYSTEM DESIGN — Token budget awareness prevents unexpected AI costs:
// A 200-message conversation + large KB can exceed 50,000 tokens at Sonnet rates.
// The buildKnowledgeBaseSection function trims KB by priority until it fits the budget.
// Older messages are trimmed first in truncateMessagesToTokenBudget.
// Always estimate before calling; truncate intelligently, not arbitrarily.

function buildKnowledgeBaseSection(entries: KnowledgeBaseEntry[], budget: number): string {
  let used = 0
  const sorted = [...entries].sort((a, b) => a.priority - b.priority)
  const included: string[] = []
  for (const e of sorted) {
    const text = `### ${e.title}\n${e.content}\n`
    if (used + text.length > budget) break
    included.push(text)
    used += text.length
  }
  return included.join('\n') || '(No knowledge base entries configured)'
}

export function buildAutonomousPrompt(ctx: PromptContext): string {
  return buildSuggestionPrompt(ctx) +
    '\n\n⚠️ This reply is sent automatically without human review. Be precise and conservative. If uncertain, say a team member will follow up rather than guessing.'
}
```

---

## 15. Twilio WhatsApp Webhook

### 15.1 `app/api/webhooks/whatsapp/route.ts`

> ⚠️ **SYSTEM DESIGN — Webhook handler time budget is 15 seconds total:**
> Twilio retries if no 200 response in 15 seconds. Order of operations: verify signature first (fast, fail early), save to Firestore (essential, do before responding), respond to Twilio, then do slow async work. Any operation that may be slow (AI call, media download) must be bounded by a timeout.

```typescript
export async function POST(req: Request) {
  const startMs = Date.now()

  // Step 0: Validate Content-Type BEFORE reading body
  // ⚠️ SYSTEM DESIGN — Content-Type validation closes a security gap:
  // Twilio ALWAYS sends application/x-www-form-urlencoded. A spoofed request
  // with Content-Type: application/json would produce an empty URLSearchParams
  // object from the body. An empty params object produces a predictable HMAC
  // signature that could be brute-forced. Reject non-form requests immediately
  // before any body reading or signature verification.
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    logger.warn({ contentType }, 'Webhook rejected — unexpected Content-Type')
    return new Response('Bad Request', { status: 400 })
  }

  // Step 1: Read body once — stream is consumed on first read
  const rawBody = await req.text()
  const params = new URLSearchParams(rawBody)

  // Step 2: Verify signature FIRST — reject before any processing
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const isValid = twilio.validateRequest(
    env.TWILIO_AUTH_TOKEN, signature,
    `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`,
    Object.fromEntries(params)
  )
  if (!isValid) {
    logger.warn({ ip: req.headers.get('x-forwarded-for') }, 'Invalid Twilio signature')
    return new Response('Unauthorized', { status: 401 })
  }

  // Step 3: Parse (pass string, not req object — testable without Web API mocking)
  const inbound = await whatsappChannel.parseInbound(rawBody, Object.fromEntries(req.headers))

  // Step 4: Idempotency check — atomic create, not get-then-set
  // ⚠️ SYSTEM DESIGN — TOCTOU (Time-Of-Check-Time-Of-Use) race condition:
  // The previous version did: get() → if not exists → set(). Two simultaneous
  // Twilio retries can BOTH pass the get() check before either writes, then both
  // process the message, creating duplicate records and duplicate AI replies.
  // The fix: use adminDb.create() which ATOMICALLY fails with ALREADY_EXISTS if
  // the document already exists. There is no window between check and write.
  // This is the correct pattern for idempotency guards in Firestore.
  const idempotencyKey = `whatsapp-${inbound.externalId}`
  const idempotencyRef = adminDb.collection(COLLECTIONS.PROCESSED_WEBHOOKS).doc(idempotencyKey)
  try {
    await idempotencyRef.create({
      processedAt: FieldValue.serverTimestamp(),
      externalId: inbound.externalId,
      // TTL field — Cloud Firestore TTL policy deletes docs where expireAt < now
      // Set a 30-day TTL to prevent unbounded collection growth (see §15.6)
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
  } catch (err: any) {
    if (err.code === 6) { // ALREADY_EXISTS (gRPC code 6)
      logger.info({ idempotencyKey }, 'Duplicate webhook rejected')
      await writeAuditLog({ action: 'webhook.duplicate_rejected', metadata: { idempotencyKey } }).catch(() => {})
      return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
    }
    throw err // Any other error is unexpected — rethrow
  }

  // Step 6: Upsert contact + conversation in a TRANSACTION
  // ⚠️ Transaction prevents duplicate contact/conversation creation when two messages
  // from the same new number arrive simultaneously
  const { contact, conversation } = await adminDb.runTransaction(async (tx) => {
    // All reads before all writes (Firestore transaction requirement)
    // ...
    return { contact, conversation }
  })

  // Step 7: Download and re-host media BEFORE saving message
  // ⚠️ Twilio media URLs expire — store Firebase Storage URL, not Twilio URL
  let finalMediaUrl: string | null = null
  if (inbound.mediaUrl) {
    finalMediaUrl = await downloadAndRehost(inbound.mediaUrl, inbound.externalId)
      .catch(err => { logger.error({ err }, 'Media rehost failed'); return null })
  }

  // Step 8: Save message with sanitised body
  const messageRef = adminDb.collection(COLLECTIONS.MESSAGES(conversation.id)).doc()
  await messageRef.set({
    /* ...all fields including sanitizeMessageBody(inbound.body), schemaVersion: 1 */
    idempotencyKey,
    mediaUrl: finalMediaUrl,
    schemaVersion: 1,
  })

  // Step 9: Update conversation metadata using increment() for counters
  await adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversation.id).update({
    lastMessage: inbound.body.slice(0, 100),
    lastMessageAt: Timestamp.fromDate(inbound.timestamp),
    lastMessageDirection: 'inbound',
    unreadCount: FieldValue.increment(1),                         // Total unread — atomic
    [`agentUnreadCounts.${conversation.assignedTo}`]: FieldValue.increment(1), // Per-agent unread
    messageCount: FieldValue.increment(1),                        // Running total — avoids count() queries
    // firstResponseAt is only set on outbound messages — not set here
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Step 10: Prepare TwiML response BEFORE triggering async work
  const twimlResponse = new Response('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })

  // Step 11: Upsert debounce record — resets the 60-second timer on every message
  // ⚠️ The webhook does NOT directly call the AI or auto-reply routes.
  // All AI work is handled by the Cloud Scheduler debounce processor (see §12.4).
  // This makes the webhook fast, simple, and well within Twilio's 15-second window.
  const executeAt = new Date(Date.now() + (settings.aiDebounceSeconds ?? 60) * 1000)
  const aiMode = (conversation.aiModeEnabled && !contact.isBlocked) ? 'auto-reply' : 'suggest'

  await adminDb.collection(COLLECTIONS.PENDING_AI_REQUESTS).doc(conversation.id).set({
    conversationId: conversation.id,
    executeAt: Timestamp.fromDate(executeAt),
    latestMessageId: messageRef.id,
    mode: aiMode,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  // merge: true = create if missing, update if present
  // On a burst of 3 messages: executeAt is reset each time, latestMessageId advances to newest
  // The scheduler will only ever process the final state of this document

  logger.info({ latencyMs: Date.now() - startMs, conversationId: conversation.id }, 'Webhook processed')
  return twimlResponse
}
```

### 15.2 `lib/twilio.ts` — Singleton

```typescript
// ⚠️ SYSTEM DESIGN — One Twilio client instance per process:
// Creating a new twilio() instance per request creates a new connection pool each time.
// Under load this exhausts file descriptors. Singleton reuses the pool.

let _client: twilio.Twilio | null = null
export function getTwilioClient() {
  if (!_client) _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  return _client
}
```

### 15.3 Media Re-hosting

```typescript
// lib/utils/mediaRehost.ts
// 1. Check content-length header FIRST — reject if > 16MB before downloading
// 2. Fetch media from Twilio URL (Basic Auth: AccountSid:AuthToken)
// 3. Detect extension from Content-Type
// 4. Upload to Firebase Storage: messages/{messageId}.{ext}
// 5. Return permanent Firebase Storage download URL
//
// ⚠️ SYSTEM DESIGN — Guard media size BEFORE downloading:
// A contact can send a video file. Without a size check, the handler downloads
// the entire file synchronously inside the 15-second Twilio window. A 100MB
// video will exceed the window, Twilio retries, and you download it again.
// Check the Content-Length response header before streaming the body.
// If Content-Length > 16MB, skip the download, log a warning, and store null.
// The agent can request the file manually if needed.
//
// ⚠️ Twilio media URLs expire. If you store the Twilio URL and an agent
// opens that conversation 7 days later, the image is broken.
// Firebase Storage URLs do not expire.
```

### 15.4 Input Sanitisation

```typescript
// lib/utils/sanitize.ts
// - Trim whitespace
// - Strip null bytes (\0) — break Firestore queries
// - Truncate to 4096 chars (WhatsApp message limit)
// - Do NOT strip emoji or non-ASCII
//
// ⚠️ Always sanitise at ingest, once. All downstream code then trusts stored data is clean.
```

### 15.5 Status Callback

```typescript
// app/api/webhooks/whatsapp/status/route.ts
// Receives: MessageSid, MessageStatus (sent/delivered/read/failed/undelivered)
// Query messages where twilioSid == MessageSid
// Update message.status
// On 'failed' or 'undelivered': write audit log 'message.failed'
```

### 15.6 `processedWebhooks` TTL — Prevent Unbounded Collection Growth

> ⚠️ **SYSTEM DESIGN — Idempotency collections grow forever without a TTL policy:**
> Every inbound WhatsApp message creates one document in `processedWebhooks`. A school receiving 50 messages/day accumulates 18,250 documents per year. At 1KB each, that is ~18MB of Firestore data that will never be read again after 30 days. Left unchecked for years, this becomes real cost and real query overhead. Firestore has a native TTL feature: set a timestamp field called `expireAt` on each document, then configure a TTL policy in the Firebase console for that collection on that field. Firestore automatically deletes documents where `expireAt` is in the past. Set TTL to 30 days — longer than any realistic Twilio retry window.
>
> **Setup (one-time, in Firebase console):**
> 1. Go to Firestore → TTL Policies → Add policy
> 2. Collection: `processedWebhooks`, Field: `expireAt`
> 3. Done — Firestore handles deletion automatically, at no read/write cost
>
> The `expireAt` field is already included in the `idempotencyRef.create()` call in §15.1 Step 4. This TTL policy setup must be completed during Phase 2 deployment.

---

## 16. Agent Management

### 16.1 Invite Flow

```
Admin submits invite form
       ↓
POST /api/agents:
  1. Create Firebase Auth user
  2. In catch: if Firestore write fails, delete Auth user (compensating transaction)
  3. Generate password reset link (acts as invitation email)
  4. Write audit log
```

> ⚠️ **SYSTEM DESIGN — Compensating transaction prevents ghost users:**
> If the server creates the Firebase Auth user but crashes before creating the Firestore `agents/{uid}` doc, you have a ghost user — they can authenticate but the app denies them (isAgent() fails). Use a try/catch that deletes the Auth user if the Firestore write fails. This is a compensating transaction — it manually reverses the first operation when the second fails.

### 16.2 Deactivation

```typescript
// DELETE /api/agents/[uid]:
// 1. Set agents/{uid}.isActive = false
// 2. Set Firebase Auth user disabled = true
// 3. adminAuth.revokeRefreshTokens(uid)  ← ⚠️ CRITICAL
// 4. Write audit log
//
// ⚠️ Without step 3, the deactivated agent's session cookie stays valid
// for up to 5 days. Token revocation forces immediate re-authentication.
```

---

## 17. Contact Management

### 17.1 Upsert with Transaction

```typescript
// lib/utils/upsertContact.ts
// ⚠️ SYSTEM DESIGN — Transaction prevents duplicate contacts on simultaneous messages:
// Two webhook requests for the same new number both query "does this contact exist?"
// Both get "no". Without a transaction, both create a contact document.
// The contact now has two records. All subsequent messages create new conversations.
// Firestore transactions prevent this: the second transaction sees the first's write
// and does not create a duplicate.
```

---

## 18. Inbox Settings

General settings (admin): business name, description, default assignment, auto-resolve days

Channel settings: WhatsApp (connected number, Webhook URL, last received, test button), Messenger scaffold, Instagram scaffold

---

## 19. Knowledge Base

- Admin-only write, agent read
- Fields: Title, Category, Content (markdown, max 500 chars recommended), Priority (1–5), Active toggle
- Priority is used when total KB exceeds token budget — higher priority entries always included

> ⚠️ **SYSTEM DESIGN — KB competes with conversation history for AI context tokens:**
> At Claude Haiku limits, the total context is tight. Priority allows admins to designate critical KB entries (emergency contacts, fee deadlines) as P1 so they are always included even when the budget is tight. Lower-priority entries are dropped first. Document this clearly in the admin UI.

---

## 20. Quick Replies & Canned Responses

> **This section answers the question: how does a low-level or new agent reply quickly and correctly without knowing shortcodes, without needing AI, and without typing from scratch every time?**
>
> The plan has two complementary systems that serve different use cases:
> - **Quick Replies** — tap-to-send answers surfaced contextually in the chat. Zero typing required. Designed for agents who are not yet confident or who are handling high volume.
> - **Canned Responses** — a library of reusable message templates, triggered by shortcode or browsed by category. Designed for agents who want to insert, edit, then send.
>
> Both draw from the same `cannedResponses` Firestore collection. The difference is in how they are surfaced and what happens when selected.

### 20.1 Data Model Update — `types/ai.ts`

```typescript
export interface CannedResponse {
  id: string
  shortcode: string         // e.g. 'fees' — no slash prefix in storage
  title: string             // Human-readable label: "Fee Payment Deadline"
  body: string              // The full message text
  category: string          // 'Fees' | 'Admissions' | 'Schedule' | 'General' | custom
  tags: string[]            // Keywords for contextual matching: ['payment', 'deadline', 'fees']
  isQuickReply: boolean     // True = shown in Quick Replies panel; False = library-only
  quickReplyOrder: number   // Sort order within Quick Replies panel (lower = shown first)
  usageCount: number        // Incremented on every use — drives "most used" ranking
  lastUsedAt: Timestamp | null
  createdBy: string
  updatedBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}
```

> ⚠️ **SYSTEM DESIGN — `isQuickReply` and `tags` separate two distinct surfaces:**
> Not every canned response should appear in the Quick Replies panel. "Thank you for contacting Bexley School" is a great quick reply. A 500-word school policy document is not. The `isQuickReply` flag lets admins curate which responses appear as one-tap options. `tags` enable contextual surfacing — when the inbound message contains "pay", "fee", or "amount", responses tagged with those words bubble up first.

### 20.2 Quick Replies Panel — `components/chat/QuickRepliesPanel.tsx`

This is a persistent panel in the chat UI, visible at all times (not triggered by a keystroke). It sits as a collapsible drawer between the message list and the input bar, or as a slide-up sheet on mobile.

**Layout — Desktop:**
```
┌──────────────────────────────────────────────────────────┐
│ ⚡ Quick Replies          [Fees] [Admissions] [General] ↕ │
├──────────────────────────────────────────────────────────┤
│  ✓ Fee deadline is Friday 25th. Pay via EcoCash...  [▶]  │
│  ✓ School opens at 7:30am. Gates close at 5:00pm.  [▶]  │
│  ✓ Admissions are open. Contact office@bexley...   [▶]  │
│  + More (12)                                             │
└──────────────────────────────────────────────────────────┘
```

**Layout — Mobile (slide-up drawer, triggered by ⚡ button in input bar):**
```
┌────────────────────────────────┐
│ ⚡ Quick Replies          [✕]  │
│ [Fees] [Admissions] [General]  │
│                                │
│ Fee deadline is Friday 25th.   │
│ Pay via EcoCash or bank...     │
│                             [▶]│
├────────────────────────────────┤
│ School opens at 7:30am...   [▶]│
├────────────────────────────────┤
│ Admissions are open...      [▶]│
└────────────────────────────────┘
```

**Behaviour:**
- Shows responses where `isQuickReply === true`, sorted by `quickReplyOrder` then `usageCount` desc
- Category filter tabs at the top — tap a category to filter, "All" shows everything
- Each row shows: message preview (truncated to 80 chars), [▶ Send] button
- **[▶ Send]**: sends the response immediately — zero additional taps, zero typing
- **Tap the preview text**: inserts into MessageInput for editing before send (same as canned response Edit behaviour)
- Contextual ranking: when the last inbound message contains keywords matching a response's `tags`, that response floats to the top of the list (client-side re-sort, no extra reads)
- Shows top 5 by default. "Show more" expands to full list.
- Panel state (open/collapsed) persists in `localStorage` per agent — if they prefer it open, it stays open

> **Why this matters for a low-level agent:** A new teacher's aide who has been asked to answer parent messages has no idea what shortcodes exist. They would send generic or incorrect responses. The Quick Replies panel shows them the pre-approved answers their school admin has set up, sorted by what's most likely relevant to the conversation. They tap send. The answer is correct, consistent, and instant — no training required beyond "tap the one that matches".

### 20.3 AI-Powered Quick Reply Suggestions — `components/chat/AISuggestionBar.tsx` (Updated)

The existing AI suggestion bar returns one suggestion. Extend it to return **3 short options** when the inbound message is a common question, alongside the one detailed suggestion.

```
┌────────────────────────────────────────────────────────────┐
│ 🤖 AI Suggestions:                              [Claude]   │
│                                                            │
│ [✓ Yes, open Friday]  [✓ Pay via EcoCash]  [✓ Call office]│
│                                                            │
│  Or detailed: "The school will be open on Friday the 25th. │
│  Fees can be paid via EcoCash or bank transfer to..."      │
│                                         [Edit] [✓ Send]   │
└────────────────────────────────────────────────────────────┘
```

**Short suggestions** are 1–6 words each. They are generated alongside the main suggestion in the same AI call by adding to the prompt: `Also generate 3 very short reply options (under 8 words each) suitable for a single tap. Return them as JSON array in field "quickOptions".`

Tapping a short option sends it immediately — same as a Quick Reply [▶ Send]. This covers the case where the contact asks a yes/no question or needs a very brief acknowledgement.

**Updated `app/api/messages/ai-suggest/route.ts` response:**
```typescript
// Returns:
// {
//   suggestion: string,          // Full detailed suggestion (existing)
//   quickOptions: string[],      // 3 short tap-to-send options (new)
//   vendor: string,
//   model: string,
// }
```

### 20.4 Canned Response Picker — `components/canned-responses/CannedResponsePicker.tsx`

Triggered when agent types `/` in MessageInput. This is the *library browser* — different from Quick Replies which is always visible.

```
┌──────────────────────────────────────────────────┐
│ /fees█                                    [✕]    │
├──────────────────────────────────────────────────┤
│ 📌 /fees    Fee Payment Deadline                 │
│    "The school fee payment deadline is Fri..."   │
├──────────────────────────────────────────────────┤
│    /feestructure  2025 Fee Structure             │
│    "Bexley School 2025 fee structure: Grade..."  │
├──────────────────────────────────────────────────┤
│ 💡 Browse all  →                                 │
└──────────────────────────────────────────────────┘
```

**Behaviour:**
- Opens immediately when `/` is typed
- Filters in real time as agent continues typing (`/fee` → shows all responses starting with "fee")
- Shows: 📌 pinned/frequent first, then alphabetical by shortcode
- Each row: shortcode in monospace, title, body preview (2 lines)
- Arrow keys / swipe to navigate, Enter / tap to **insert** (not send — paste into input for editing)
- `Escape` or backspace past `/` closes the picker
- Empty state: "No responses match — [+ Create one]" deep-links to canned responses page
- Keyboard shortcut: the picker shows "Press Tab to send directly" — Tab key sends without editing

> ⚠️ **SYSTEM DESIGN — Load canned responses once on app mount, not on every `/` keypress:**
> If the `CannedResponsePicker` queries Firestore on every `/` keystroke, a fast typist causes multiple reads per second. Load all canned responses into a Zustand store when the agent logs in (one `getDocs()` call, typically < 50 documents). Filter the store client-side on each keystroke. The store refreshes every 5 minutes via a background `getDocs()` call. This gives instant filtering with minimal read cost.

### 20.5 Canned Response Management Page — `app/(dashboard)/canned-responses/page.tsx`

This is where admins set up the library. It must be designed for someone non-technical (a school secretary or admin) to use easily.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Canned Responses & Quick Replies          [+ New]        │
│                                                          │
│ [All] [Fees] [Admissions] [Schedule] [General] [+ Cat]  │
├──────────────────────────────────────────────────────────┤
│ ⚡ /fees   Fee Payment Deadline              [Edit][Del] │
│   "The school fee payment deadline is Friday..."         │
│   Used 47 times  ·  Last used: 2 hours ago               │
├──────────────────────────────────────────────────────────┤
│ ⚡ /hours  School Opening Hours              [Edit][Del] │
│   "School opens at 7:30am. Gates close at 5:00pm..."     │
│   Used 23 times  ·  Last used: Yesterday                 │
├──────────────────────────────────────────────────────────┤
│    /policy Full School Policy (long)         [Edit][Del] │
│   "Bexley School Policy 2025: Section 1..."              │
│   Used 2 times  ·  Last used: 3 months ago               │
└──────────────────────────────────────────────────────────┘
```

- ⚡ icon indicates `isQuickReply === true` — shown in the panel
- No ⚡ icon = library-only, triggered by shortcode only
- "Used X times" and "Last used" come from `usageCount` and `lastUsedAt`
- Sorted by `usageCount` desc by default — most useful responses are at the top

**Create/Edit Drawer:**
```
Title:        [Fee Payment Deadline              ]
Shortcode:    [/ fees                            ]  ← auto-lowercased, spaces removed
Category:     [Fees ▾                            ]
Tags:         [payment, deadline, fee, ecoCash   ]  ← comma-separated keywords
Message:      [The school fee payment deadline is
               Friday the 25th. Payment can be
               made via EcoCash to 0771234567
               or bank transfer to...            ]  ← textarea, char count shown
                                          412/1000

⚡ Show as Quick Reply    [toggle — ON]
   Quick Reply order:    [3                      ]  ← position in panel
[Cancel]                                   [Save]
```

> **Why `tags` and `quickReplyOrder` are in the admin UI:** Tags determine contextual relevance — an admin who knows the school's vocabulary can dramatically improve AI and Quick Reply accuracy by adding the right keywords. `quickReplyOrder` lets the admin curate exactly what a new agent sees first — put the 5 most common questions at the top and a new agent can handle 80% of volume without any training.

### 20.6 `lib/stores/cannedResponseStore.ts` (Zustand)

```typescript
interface CannedResponseStore {
  responses: CannedResponse[]
  lastFetchedAt: number | null
  loading: boolean

  // Loaded once on login, refreshed every 5 minutes in background
  fetch(): Promise<void>
  shouldRefresh(): boolean  // true if lastFetchedAt is null or > 5min ago

  // Client-side filters (no Firestore reads)
  getByShortcode(prefix: string): CannedResponse[]
  getQuickReplies(category?: string): CannedResponse[]
  getByKeywords(keywords: string[]): CannedResponse[]  // For contextual surfacing

  // Called when a response is used — updates local count immediately, writes to Firestore
  recordUsage(id: string): void
}
```

> ⚠️ **SYSTEM DESIGN — Preload canned responses into Zustand on login, not on demand:**
> The canned response library is typically 10–50 documents. Loading it once at login costs 10–50 reads. Loading it on demand (every time the agent types `/`) costs 10–50 reads per trigger. With 3 agents typing `/` 20 times a day each, on-demand loading costs 1,800–9,000 reads/day for a feature that serves < 50 documents. Preloading costs 30–150 reads/day total. The store refreshes in the background every 5 minutes so new responses added by the admin appear within 5 minutes — agents never need to reload the page.

### 20.7 Contextual Quick Reply Ranking — Client-Side

When an inbound message arrives, the `QuickRepliesPanel` re-sorts its list based on keyword overlap with the message body:

```typescript
// lib/utils/rankQuickReplies.ts
export function rankQuickReplies(
  responses: CannedResponse[],
  inboundMessageBody: string
): CannedResponse[] {
  const words = inboundMessageBody.toLowerCase().split(/\s+/)

  return [...responses].sort((a, b) => {
    const scoreA = a.tags.filter(tag => words.some(w => w.includes(tag))).length
    const scoreB = b.tags.filter(tag => words.some(w => w.includes(tag))).length
    if (scoreB !== scoreA) return scoreB - scoreA   // Higher keyword match first
    return (b.usageCount - a.usageCount)             // Tie-break: more used first
  })
}
```

This is pure client-side logic — zero Firestore reads. The ranking updates every time a new inbound message arrives. An agent who handles a fee question sees fee-related quick replies at the top before they even start typing.

### 20.8 New Indexes Required

```json
{
  "collectionGroup": "cannedResponses",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isQuickReply", "order": "ASCENDING" },
    { "fieldPath": "quickReplyOrder", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "cannedResponses",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "usageCount", "order": "DESCENDING" }
  ]
}
```

---

## 21. Audit Log

```typescript
// lib/auditLog.ts
// ⚠️ SYSTEM DESIGN — Audit logging must be non-blocking and non-failing:
// If writeAuditLog throws and you haven't caught it, a message send fails because
// of an audit logging problem. The parent retries and gets a duplicate.
// Pattern: await writeAuditLog(...).catch(err => logger.error({ err }, 'Audit log failed'))
// The audit log failure is recorded but does NOT fail the parent operation.
```

---

## 22. Notifications

- Browser Notification API: request permission after first login (not on page load — browsers block unsolicited requests)
- `react-hot-toast`: success, error, info, warning toasts
- Document title: `(${total}) Bexley Inbox` when unread count > 0

---

## 23. Search

Client-side filtering on loaded data — sufficient for school scale (< 500 contacts).

```typescript
// TODO Phase 2: Replace with Algolia or Typesense for full message body search
// at scale. Firestore does not support full-text search natively.
```

---

## 24. Analytics

```typescript
// ⚠️ SYSTEM DESIGN — Cache analytics results to avoid repeated Firestore reads:
// An analytics page that runs count() queries on every visit accumulates
// read costs quickly. Cache computed metrics in Firestore analytics/cache/{period}
// for 5 minutes. Stale if older than 5 minutes — recompute and update cache.
// A 5-minute lag is acceptable for reporting; this is not a real-time ops dashboard.
```

Metrics: volume (conversations, messages, response time), AI (suggestions, approval rate, autonomous count), agents (conversations, messages, resolution time — admin only)

---

## 25. Channel Expansion Scaffolds

### 25.1 What Adding Facebook Messenger Requires

1. Implement `ChannelProvider` in `lib/channels/messenger.ts`
2. Handle GET (hub.challenge) and POST in `/api/webhooks/messenger/route.ts`
3. Meta Developer Console: Facebook App with Messenger product
4. Meta app review for `pages_messaging` permission
5. Env vars: `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_APP_SECRET`
6. Settings → Channels connect UI
7. Enable `messengerChannelEnabled` feature flag

> ⚠️ **SYSTEM DESIGN — Meta app review for self-hosted instances is a real blocker:**
> Meta requires app review for production Messenger API access. This is a manual process taking days to weeks with a real rejection rate for self-hosted apps. The Chatwoot cloud path avoids this because Chatwoot's app is already Meta-approved. Plan this well in advance if Messenger is important.

### 25.2 Scaffold Routes

Both webhook routes: respond to GET (hub.challenge), respond to POST with 200, log payload, return `{ status: 'channel_not_active' }`

### 25.3 Architecture is Already Ready

`conversation.channel`, `message.direction`, AI flow, audit logging, display — all channel-agnostic. Adding a new channel is purely additive. No core code changes.

---

## 26. Mobile Optimisation

- `h-[100dvh]` not `h-screen` for chat layout
- `font-size: 16px` on all inputs (prevents iOS zoom)
- `padding-bottom: env(safe-area-inset-bottom)` on bottom nav
- All tap targets minimum 44×44px
- `React.memo` on `ConversationItem` — prevent full list re-renders
- `content-visibility: auto` or `react-virtual` if list > 100 items
- Offline banner using `useOnlineStatus` hook
- Firestore offline persistence via `persistentLocalCache` (Section 5.2)

---

## 27. Observability & Error Handling

> ⚠️ **SYSTEM DESIGN — This section was missing from the original plan. It is not optional.**
> Without observability you are flying blind. A parent's message silently failing to reach an agent, an AI call timing out every hour, or a webhook being rejected — none of these are visible without structured logging and error tracking. Observability is how you know the system is working without looking at it manually.

### 27.1 `lib/logger.ts`

```typescript
import pino from 'pino'

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  base: { service: 'bexley-inbox', env: process.env.NODE_ENV },
})

// ⚠️ Always include relevant IDs in log context:
// logger.info({ conversationId, agentId, latencyMs }, 'Message sent')
// NOT: logger.info('Message sent')
// Without IDs, a log line is useless for debugging a specific conversation.
```

### 27.2 Sentry

```typescript
// sentry.server.config.ts + sentry.client.config.ts
// tracesSampleRate: 0.1 server, 0.05 client
// Capture in ErrorBoundary.componentDidCatch
// Capture in every API route catch block — include Sentry event ID in error response
```

### 27.3 API Error Response Contract

```typescript
// All API routes return:
// Success:       { ok: true, data: T }
// Client error:  { ok: false, error: string, code: string }
//                code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'RATE_LIMITED'
// Server error:  { ok: false, error: 'Internal server error', sentryId: string }
```

### 27.4 Input Validation on Every Route

```typescript
// Every API route validates its request body with Zod before any processing
// lib/validators/api.ts contains all schemas
// On validation failure: return 400 with Zod error details — never process invalid input
```

### 27.5 Security Headers

```javascript
// next.config.js
// X-Content-Type-Options: nosniff — prevents MIME sniffing attacks
// X-Frame-Options: DENY — prevents clickjacking
// Content-Security-Policy — limits script/data origins
// ⚠️ These are one-time configs that protect all users permanently.
// Set them before first deploy.
```

---

## 28. Testing Strategy

> ⚠️ **SYSTEM DESIGN — Tests are the safety net for a system that handles real school communications:**
> A bug in auto-reply could send incorrect fee information to parents. A bug in the send endpoint could silently drop messages. A bug in agent deactivation could leave a former employee with access. The test coverage thresholds below are minimums — the autonomous AI paths (Phase 4) require 85% branch coverage. Do not ship Phase 4 without the full test suite passing.

### 28.1 `jest.config.ts`

```typescript
coverageThreshold: {
  global: { branches: 70, functions: 80, lines: 80, statements: 80 },
  './lib/ai/': { branches: 85, functions: 90, lines: 90, statements: 90 },
  './app/api/webhooks/': { branches: 85, functions: 90, lines: 90, statements: 90 },
}
```

### 28.2 MSW Handlers

Mock: Claude API, OpenAI API, Twilio send. Include a simulated timeout handler for AI timeout tests.

### 28.3 Unit Tests

**`lib/ai/rateLimiter.test.ts`:** allowed when under limit, blocked at limit, only counts autonomous messages, only counts last hour, handles zero messages

**`lib/ai/prompts.test.ts`:** includes business name, KB sorted by priority, truncates over budget, always includes P1 entries, autonomous prompt has caution warning, empty KB returns placeholder

**`lib/ai/claude.test.ts`:** correct parameters, passes AbortSignal, handles empty content, logs on failure, re-throws error

**`lib/channels/whatsapp.test.ts`:** parses phone/name/body/sid, strips `whatsapp:` prefix, detects media type, verifies signature correctly

**`lib/utils/phone.test.ts`:** normalises E.164, strips `whatsapp:` prefix, rejects non-E.164

**`lib/utils/tokens.test.ts`:** estimates sensibly, truncation keeps newest messages, always keeps at least 1

**`lib/utils/sanitize.test.ts`:** strips null bytes, truncates to 4096, trims whitespace, preserves emoji

### 28.4 Integration Tests

**`send.test.ts`:** saves message to Firestore with client-provided `messageId` as doc ID, returns 401 without session, validates body (400), returns 404 for missing conversation, stores `twilioSid`, same `idempotencyKey` twice = second call returns original response without re-sending, rejects send to resolved conversation (422), `sentAt` is rejected if more than 60 seconds old (400), message written to Firestore with `status: 'sent'` (not 'sending' — 'sending' is client-only)

**`useMessages.test.ts` (updated):** optimistic message appears before server responds, optimistic message is removed when `onSnapshot` delivers confirmed version with same `id`, two messages with same `id` never appear simultaneously, `failMessage()` sets optimistic entry to `status: 'failed'`, `loadOlder()` uses `endBefore` + `limitToLast`, scroll position is preserved after older messages are inserted

**`ai-suggest.test.ts`:** saves suggestion to message doc with `aiSuggestionPending: false` after success; sets `aiSuggestionPending: false` on failure too (clears shimmer even on error); AI timeout returns `{ suggestion: null }` not 500; blocked contact skips suggestion; empty KB works; all three vendors work; updates `conversation.lastAiSuggestionMessageId`; `isStale()` returns true when suggestion age > 2 hours; `isStale()` returns true when new messages arrived after suggestion generatedAt

**`auto-reply.test.ts`:** wrong secret returns 401, blocked contact returns `{ sent: false, blocked: true }`, rate limit returns `{ sent: false, rateLimited: true }`, outside business hours sends out-of-hours message, processing sentinel prevents concurrent duplicates

**`whatsapp-webhook.test.ts`:** invalid signature returns 401, invalid Content-Type returns 400, duplicate MessageSid returns 200 WITHOUT duplicate message (atomic idempotency), creates contact if not exists (transaction), creates conversation if not exists, saves message with all fields, downloads+rehosts media, rejects oversized media (> 16MB) gracefully, sanitises body, triggers auto-reply when enabled, triggers suggestion when not

**`agents.test.ts`:** creates Auth user + Firestore doc, compensating transaction deletes Auth user on Firestore failure, deactivation revokes refresh tokens

**`featureFlags.test.ts`:** returns cached value within TTL, re-fetches after TTL expires, disabling `aiAutonomousModeEnabled` prevents auto-reply

### 28.5 Component Tests

**`AISuggestionBar.test.tsx`:** renders shimmer when `aiSuggestionPending: true` and suggestion is null; renders nothing when both false/null; renders stale banner when `isStale()` returns true (age > 2hrs); renders stale banner when new messages arrived after suggestion; renders full suggestion when fresh; [Send] calls `onSend` with full body; quick option buttons call `onSend` with that option's short text; [Dismiss] calls `onDismiss` and clears `lastAiSuggestionMessageId`; [Edit] calls `onEdit` with body; [Regenerate] calls `onRegenerate`; swipe left triggers dismiss

**`ErrorBoundary.test.tsx`:** renders children when no error, renders fallback when child throws, reports to Sentry on throw

**`MessageBubble.test.tsx` additional cases:** `status: 'failed'` shows red error indicator AND a Retry button; Retry button calls send with same `idempotencyKey`; optimistic bubble shows clock icon; optimistic bubble has opacity 0.8

**`useMessages.test.ts`:** optimistic message appears before server responds; optimistic message is removed when `onSnapshot` delivers confirmed version with same `id`; two messages with same `id` never appear simultaneously; `failMessage()` sets optimistic entry to `status: 'failed'`; `loadOlder()` uses `endBefore` + `limitToLast`; scroll position is preserved after older messages are inserted

**`cannedResponseStore.test.ts`:** loads responses on first call, returns cached value within 5-minute window, re-fetches after 5 minutes, `getByShortcode('fee')` returns correct responses, `getQuickReplies()` returns only `isQuickReply === true` entries, `recordUsage()` increments count locally and writes to Firestore

**`rankQuickReplies.test.ts`:** responses with matching tags rank above those without, tie-breaks by `usageCount`, returns all responses when no keywords match, handles empty tags array gracefully

**`QuickRepliesPanel.test.tsx`:** renders only `isQuickReply === true` responses, category filter shows correct subset, send button calls `onSend` with full body text, tap on preview inserts into input (calls `onInsert`), re-sorts when `inboundMessage` prop changes, "Show more" expands full list

**`CannedResponsePicker.test.tsx`:** renders when `/` is typed, filters by shortcode prefix, keyboard navigation works (arrow down/up), Enter selects and inserts, Escape closes without inserting, empty state shows "Create one" link, Tab sends directly without editing

---

## 29. Deployment

### 29.1 `storage.rules`

```javascript
// ⚠️ SYSTEM DESIGN — Storage rules must be deny-by-default:
// The original rules only protected the messages/ path. Any other path
// (future agent avatars, KB attachments, exported reports) would be
// publicly readable. Storage rules must follow the principle of least privilege:
// deny everything by default, then explicitly allow what is needed.
// A new storage path that isn't listed here is automatically protected.

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Deny everything by default
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // Message media: authenticated agents can read, server-only write
    match /messages/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false;  // Server Admin SDK only
    }

    // Agent avatars: agents can read all, write only their own
    match /avatars/{agentUid}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == agentUid
        && request.resource.size < 2 * 1024 * 1024  // 2MB max
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### 29.2 Firestore Indexes

All indexes from original plan, plus:
```json
{
  "collectionGroup": "messages",
  "fields": [
    { "fieldPath": "twilioSid", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "conversations",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "assignedTo", "order": "ASCENDING" },
    { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "pendingAiRequests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "executeAt", "order": "ASCENDING" }
  ]
}
```

> ⚠️ **SYSTEM DESIGN — The `resolvedAt` + `status` index is required by the archiving job:**
> The archiving Cloud Scheduler job queries: `where('status', '==', 'resolved').where('resolvedAt', '<', cutoffDate)`. Without a composite index on both fields, this query will fail or perform a full collection scan. The index above covers it. Deploy it before the archiving job is deployed.

> ⚠️ **SYSTEM DESIGN — Missing indexes cause silent query failures:**
> A Firestore query that needs a composite index but has none returns no results (or throws) without a clear error. An empty conversation list or missing messages is the symptom. Deploy all indexes BEFORE deploying the code that uses them: `firebase deploy --only firestore:indexes`.

### 29.3 Pre-Deployment Checklist

- [ ] All env variables set in App Hosting console
- [ ] `WEBHOOK_SECRET` is 32+ chars (`openssl rand -hex 32`)
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed (BEFORE code deploy)
- [ ] Storage rules deployed (deny-by-default, not messages-only)
- [ ] `processedWebhooks` TTL policy configured in Firebase console (Section 15.6)
- [ ] Sentry project created + DSN in env
- [ ] Admin agent created in Auth + Firestore manually
- [ ] `settings/global` document seeded (run seed script)
- [ ] `settings/featureFlags` document created with all flags set appropriately
- [ ] Twilio webhook URL updated to production
- [ ] Twilio status callback URL set
- [ ] `npm test -- --coverage` — all thresholds pass
- [ ] `npm run build` — zero TypeScript errors
- [ ] Smoke test: send WhatsApp → appears in inbox → reply → delivered
- [ ] Smoke test: enable AI mode → send → AI replies once (not twice — verify via audit log)
- [ ] Smoke test: trigger rate limit → verify fallback behaviour
- [ ] Smoke test: send same webhook twice (simulate Twilio retry) → verify only one message in Firestore
- [ ] Confirm Sentry receives a test event
- [ ] Confirm Google Cloud Logging shows structured JSON logs

---

## 30. Feature Flags

```typescript
// Firestore document: settings/featureFlags
// Read by API routes and layout component
// Changes take effect immediately — no code deploy required

export interface FeatureFlags {
  messengerChannelEnabled: boolean
  instagramChannelEnabled: boolean
  analyticsEnabled: boolean
  auditLogEnabled: boolean
  knowledgeBaseEnabled: boolean
  cannedResponsesEnabled: boolean
  aiSuggestionsEnabled: boolean       // Global kill switch for AI suggestions
  aiAutonomousModeEnabled: boolean    // Global kill switch for all autonomous replies
}
```

> ⚠️ **SYSTEM DESIGN — `aiAutonomousModeEnabled` is an emergency brake:**
> If the AI starts producing incorrect or inappropriate responses (it will happen eventually), setting `aiAutonomousModeEnabled = false` in Firestore stops all autonomous replies across all conversations immediately — no code deploy needed, takes effect in seconds. This is your most important operational control. It must be the first thing checked in `/api/ai/auto-reply` before any other processing.

> ⚠️ **SYSTEM DESIGN — Cache feature flags to prevent a Firestore read on every API request:**
> Every webhook handler and every API route that checks `aiAutonomousModeEnabled` or `aiSuggestionsEnabled` incurs a Firestore read if it fetches the flags fresh each time. At 100 messages/hour, that is 100 extra reads per flag check per hour. Cache the flags in a module-level variable with a 60-second TTL:
> ```typescript
> // lib/featureFlags.ts
> let cache: { flags: FeatureFlags; fetchedAt: number } | null = null
> const TTL_MS = 60 * 1000  // 60 seconds
>
> export async function getFeatureFlags(): Promise<FeatureFlags> {
>   if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.flags
>   const doc = await adminDb.collection(COLLECTIONS.SETTINGS).doc('featureFlags').get()
>   const flags = doc.data() as FeatureFlags
>   cache = { flags, fetchedAt: Date.now() }
>   return flags
> }
> ```
> The 60-second TTL means the emergency brake takes effect within 1 minute — acceptable for an emergency stop. In a serverless environment each function instance has its own module-level cache, but the TTL keeps the lag bounded.

---

## 31. Task Checklist

Work through these in order. Each item is a separate commit. Do not start a phase until all tests from the previous phase pass.

### Phase 0 — Project Bootstrap
- [ ] Create Next.js app, install all dependencies (Section 2)
- [ ] Configure `tsconfig.json` path alias `@/`
- [ ] Run `npx shadcn@latest init`
- [ ] Write `lib/env.ts` — verify it throws on missing vars
- [ ] Set up Jest + Testing Library + MSW (write one passing test to confirm setup)
- [ ] Set up ESLint + Prettier + Husky pre-commit
- [ ] Create `.env.example` (all variable names, no values)
- [ ] Set up Firebase project (Auth, Firestore `europe-west1`, Storage, App Hosting)
- [ ] Write `lib/firebase/client.ts` — use `try/catch` around `initializeFirestore`, NOT the `getApps().length === 1` condition
- [ ] Write `lib/firebase/admin.ts` with singleton guard
- [ ] Write `lib/logger.ts` (pino)
- [ ] Configure Sentry (`sentry.server.config.ts` + `sentry.client.config.ts`)

### Phase 1 — Auth & Layout
- [ ] Write `middleware.ts` (cookie presence check first)
- [ ] Write `/api/auth/session` POST + DELETE
- [ ] Write `/api/auth/verify` GET
- [ ] Update `middleware.ts` to call `/api/auth/verify`
- [ ] Write `LoginForm.tsx`
- [ ] Write `Sidebar.tsx`, `MobileNav.tsx`, `TopBar.tsx`
- [ ] Write `ErrorBoundary.tsx`
- [ ] Write `app/(dashboard)/layout.tsx`
- [ ] Write `useCurrentAgent.ts`
- [ ] Deploy Firestore security rules
- [ ] **Tests:** `LoginForm.test.tsx`, `ErrorBoundary.test.tsx`

### Phase 2 — Conversations & Messaging Core
- [ ] Write all types and `collections.ts`
- [ ] Write `lib/utils/phone.ts` + tests
- [ ] Write `lib/utils/sanitize.ts` + tests
- [ ] Write `lib/utils/tokens.ts` + tests
- [ ] Write `lib/utils/idempotency.ts` + tests
- [ ] Write `lib/utils/mediaRehost.ts` with Content-Length size guard (reject > 16MB before downloading)
- [ ] Write `lib/twilio.ts` singleton
- [ ] Write `lib/channels/whatsapp.ts` — `parseInbound` takes string not Request
- [ ] Write `lib/featureFlags.ts` with 60-second module-level cache
- [ ] Write `useConversations.ts` with cursor pagination (`startAfter` + `hasMore`)
- [ ] Write `useMessages.ts` — two-list merge (optimistic + confirmed), `addOptimisticMessage`, `confirmMessage`, `failMessage`, `endBefore`+`limitToLast` for older messages, scroll position preservation, max 3 simultaneous listeners cap (Phase 3)
- [ ] Write conversation list components (`React.memo` on `ConversationItem`)
- [ ] Write `ChatWindow.tsx` using `h-[100dvh]`
- [ ] Write `MessageBubble.tsx` — all variants: optimistic (clock icon, opacity 0.8), confirmed (ticks), failed (red + retry), AI autonomous (indigo)
- [ ] Write `MessageInput.tsx` — clears input and inserts optimistic message in same React state update, disabled during sending, 16px font-size, file validation
- [ ] Write `/api/messages/send/route.ts` — accepts client-generated `messageId` as Firestore doc ID, validates `sentAt` within 60s, writes `status: 'sent'` (never 'sending'), Zod + atomic idempotency + transaction
- [ ] Write `/api/webhooks/whatsapp/route.ts` — Content-Type check, atomic `create()` idempotency, transaction, media size guard, awaited trigger
- [ ] Write `/api/webhooks/whatsapp/status/route.ts`
- [ ] Deploy Firestore indexes (BEFORE deploying code that uses them)
- [ ] Configure `processedWebhooks` TTL policy in Firebase console (Section 15.6)
- [ ] **Tests:** `send.test.ts`, `whatsapp-webhook.test.ts`, `whatsapp.channel.test.ts`, `MessageBubble.test.tsx`, `useMessages.test.ts`, `featureFlags.test.ts`

### Phase 3 — AI Assisted Mode (Debounce Architecture)
- [ ] Write `lib/ai/claude.ts`, `openai.ts`, `gemini.ts` with AbortSignal + logging
- [ ] Write `lib/ai/index.ts` factory
- [ ] Write `lib/ai/prompts.ts` with token budget + priority + `quickOptions` in response
- [ ] Write `types/pendingAiRequest.ts`
- [ ] Add `PENDING_AI_REQUESTS` to `lib/firebase/collections.ts`
- [ ] Write `/api/messages/ai-suggest/route.ts` — saves suggestion + `quickOptions` to MESSAGE doc, writes `aiSuggestionPending: false` on completion (success or failure)
- [ ] Update webhook Step 11 to upsert `pendingAiRequests` instead of directly calling ai-suggest
- [ ] Write Cloud Scheduler job `functions/src/processAiRequests.ts` — runs every 1 minute, processes docs where `executeAt <= now`, sets `aiSuggestionPending: true` on target message before calling ai-suggest, deletes processed docs
- [ ] Configure TTL policy on `pendingAiRequests` collection (`expireAt = executeAt + 24h`)
- [ ] Write `AISuggestionBar.tsx` — four states: shimmer, hidden, stale banner, full suggestion
- [ ] Add `aiDebounceSeconds` to AI settings page (10–300 range, default 60)
- [ ] **Tests:** `claude.test.ts`, `prompts.test.ts`, `ai-suggest.test.ts`, `AISuggestionBar.test.tsx`, `processAiRequests.test.ts`

### Phase 4 — AI Autonomous Mode (Debounce shares the same queue)
- [ ] Write `lib/ai/rateLimiter.ts`
- [ ] Write `lib/stores/aiModeStore.ts`
- [ ] Write `AIModeToggle.tsx` with confirmation dialog
- [ ] Write `/api/ai/auto-reply/route.ts` with processing sentinel + constant-time secret comparison
- [ ] Verify webhook correctly sets `mode: 'auto-reply'` in `pendingAiRequests` when `aiModeEnabled = true`
- [ ] The debounce queue from Phase 3 handles both modes — auto-reply is triggered by the scheduler using the `mode` field
- [ ] Add `isBlocked` + `aiAutonomousModeEnabled` feature flag checks in the scheduler job
- [ ] Add AI autonomous message styling (distinct indigo background + robot icon)
- [ ] **Tests:** `auto-reply.test.ts`, `rateLimiter.test.ts`, `AIModeToggle.test.tsx`
- [ ] **Manual:** send 3 rapid messages → confirm only ONE AI reply arrives after ~60s, not 3

### Phase 5 — Knowledge Base, Quick Replies & Canned Responses
- [ ] Write KB UI with priority field
- [ ] Wire KB into prompt builder (sorted by priority, token budget aware)
- [ ] Update `CannedResponse` type with `isQuickReply`, `quickReplyOrder`, `tags`, `lastUsedAt` fields
- [ ] Write `lib/stores/cannedResponseStore.ts` — preloads on login, refreshes every 5 minutes, filters client-side
- [ ] Write `lib/utils/rankQuickReplies.ts` — keyword matching against inbound message, zero Firestore reads
- [ ] Write `components/chat/QuickRepliesPanel.tsx` — always-visible tap-to-send panel, category tabs, contextual sort
- [ ] Wire `QuickRepliesPanel` into `ChatWindow.tsx` — re-ranks on every new inbound message
- [ ] Write `CannedResponsePicker.tsx` — `/` triggered, insert mode, sorted by usage
- [ ] Wire `/` trigger in `MessageInput.tsx` with ⚡ button
- [ ] Update `AISuggestionBar.tsx` to show 3 quick option buttons alongside the detailed suggestion
- [ ] Update `/api/messages/ai-suggest/route.ts` to return `quickOptions: string[]` alongside `suggestion`
- [ ] Update `lib/ai/prompts.ts` to request quick options in the same prompt (no extra AI call)
- [ ] Write canned responses management page with full create/edit drawer including `isQuickReply` toggle and `tags` field
- [ ] Add new canned response indexes to `firestore.indexes.json`
- [ ] **Tests:** `cannedResponseStore.test.ts`, `rankQuickReplies.test.ts`, `QuickRepliesPanel.test.tsx`, `CannedResponsePicker.test.tsx`

### Phase 6 — Contacts & Agent Management
- [ ] Write `lib/utils/upsertContact.ts` with Firestore transaction
- [ ] Write contacts UI and routes
- [ ] Write agent management UI
- [ ] Write `/api/agents/route.ts` with compensating transaction
- [ ] Write deactivation with refresh token revocation (`adminAuth.revokeRefreshTokens`)

### Phase 7 — Settings, Audit Log, Analytics, Scheduled Jobs
- [ ] Wire `writeAuditLog()` into every API route (non-blocking, non-failing)
- [ ] Write audit log UI (cursor pagination)
- [ ] Write analytics API with 5-minute cache — use `messageCount`, `resolvedAt`, `firstResponseAt` from conversation docs, do NOT scan message subcollections
- [ ] Write analytics UI
- [ ] Write all settings pages (including `aiDebounceSeconds` slider, 10–300 range)
- [ ] Write `settings/global` seed script
- [ ] Write `settings/featureFlags` seed document
- [ ] Write Cloud Scheduler job for snoozed conversation reopening (every 15 minutes, spec in §11.7)
- [ ] Verify `processAiRequests` Cloud Scheduler job from Phase 3 is deployed and processing correctly
- [ ] Write Cloud Scheduler job for conversation archiving — runs weekly, moves resolved conversations where `resolvedAt < now - 365 days` to `archivedConversations/` collection with messages subcollection
- [ ] Add contact history panel that reads from both `conversations/` (live) and `archivedConversations/` (one-time getDocs) to show full contact history without loading old data into real-time listeners

### Phase 8 — Observability, Notifications, Search, Polish
- [ ] Verify structured logging in production (check Google Cloud Logging)
- [ ] Verify Sentry receives test errors
- [ ] Write browser notification logic (post-login permission request)
- [ ] Wire `react-hot-toast`
- [ ] Write unread count in document title
- [ ] Write search component
- [ ] Write `useOnlineStatus` hook + offline banner
- [ ] Audit all tap targets (44px minimum)
- [ ] Add swipe gestures
- [ ] Add security headers to `next.config.js`
- [ ] Write PWA manifest + icons
- [ ] Write `storage.rules` and deploy

### Phase 9 — Channel Scaffolds
- [ ] Write `messenger.ts` and `instagram.ts` scaffold implementations
- [ ] Write scaffold webhook routes (hub.challenge + logging)
- [ ] Add channel cards in Settings → Channels
- [ ] Deploy feature flags document

### Phase 10 — Final Testing & Deployment
- [ ] `npm test -- --coverage` — all thresholds pass
- [ ] `npm run build` — zero type errors
- [ ] Deploy rules, indexes, storage rules (indexes FIRST)
- [ ] Set all env vars in App Hosting console
- [ ] Create admin agent + seed settings documents
- [ ] Update Twilio webhook URLs
- [ ] Run all three smoke tests
- [ ] Confirm Sentry event received
- [ ] Confirm Google Cloud Logging shows JSON

---

*End of Project Plan — Bexley Inbox v1.0 (Revision 2, System Design Audit)*
*Estimated development time: 7–9 weeks solo, 3–4 weeks with 2 developers*
*Every `⚠️ SYSTEM DESIGN:` note documents a deliberate architectural decision. Changing any of these without reading the note risks re-introducing the exact bug the note was written to prevent.*