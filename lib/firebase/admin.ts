import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getStorage, type Storage } from 'firebase-admin/storage'

// ⚠️ Lazy initialization — do NOT initialize at module level.
// Next.js evaluates API route modules at build time for static analysis.
// Firebase Admin requires valid credentials that only exist at runtime.
// Using getters ensures initialization happens on first access, not at import.

function getApp(): App {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    return (getFirestore(getApp()) as any)[prop as string]
  },
})

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (getAuth(getApp()) as any)[prop as string]
  },
})

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    return (getStorage(getApp()) as any)[prop as string]
  },
})
