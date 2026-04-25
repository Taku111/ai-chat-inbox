import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth as getFirebaseAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null
let _storage: FirebaseStorage | null = null

function getApp(): FirebaseApp {
  if (_app) return _app
  _app =
    getApps().length === 0
      ? initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        })
      : getApps()[0]
  return _app
}

// Call these inside components/hooks/stores — never at module top-level.
// Calling at module level runs during SSR before the browser is ready.
export function getAuth(): Auth {
  if (!_auth) _auth = getFirebaseAuth(getApp())
  return _auth
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp())
  return _db
}

export function getStorageInstance(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getApp())
  return _storage
}
