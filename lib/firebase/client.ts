import { initializeApp, getApps } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

// ⚠️ Firebase Client SDK must only initialize in the browser.
// During SSR (Next.js App Router server rendering of 'use client' components),
// this module runs on the server where NEXT_PUBLIC_ vars may not be available
// and where browser APIs (IndexedDB for persistence) don't exist.
//
// We export lazy getters so components import successfully on the server
// but actual initialization only happens client-side.

let _auth: Auth | null = null
let _db: Firestore | null = null
let _storage: FirebaseStorage | null = null

function initClient() {
  if (typeof window === 'undefined') return

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

  _auth = getAuth(app)
  _storage = getStorage(app)

  // ⚠️ Use try/catch — initializeFirestore throws if called more than once.
  try {
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    _db = getFirestore(app)
  }
}

// Initialize immediately if in browser
initClient()

// Re-initialize if module is imported in browser after SSR hydration
if (typeof window !== 'undefined' && !_auth) {
  initClient()
}

// Proxy getters — safe to access on server (returns null), work in browser
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) initClient()
    return (_auth as any)?.[prop as string]
  },
})

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) initClient()
    return (_db as any)?.[prop as string]
  },
})

export const storage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    if (!_storage) initClient()
    return (_storage as any)?.[prop as string]
  },
})
