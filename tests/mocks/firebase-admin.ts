/**
 * Firebase Admin mock for integration tests.
 * Provides controllable in-memory Firestore + Auth.
 */

// In-memory store
const store: Record<string, Record<string, any>> = {}

function getDoc(path: string) {
  return store[path] ?? null
}

function setDoc(path: string, data: any) {
  store[path] = { ...data }
}

export function clearStore() {
  Object.keys(store).forEach(k => delete store[k])
}

export function seedDoc(path: string, data: any) {
  store[path] = { ...data }
}

// Chainable query builder mock
class QueryMock {
  private _results: any[] = []
  private _collectionPath = ''

  constructor(collectionPath: string) {
    this._collectionPath = collectionPath
  }

  where(_field: string, _op: string, _value: any) { return this }
  orderBy() { return this }
  limit() { return this }
  limitToLast() { return this }
  count() {
    return { get: async () => ({ data: () => ({ count: this._results.length }) }) }
  }

  async get() {
    // Return all docs in this collection prefix
    const prefix = this._collectionPath + '/'
    const docs = Object.entries(store)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({
        id: k.split('/').pop(),
        ref: { update: jest.fn(), delete: jest.fn(), set: jest.fn() },
        exists: true,
        data: () => v,
      }))
    return { docs, empty: docs.length === 0 }
  }

  doc(id = 'auto-id') {
    const path = this._collectionPath + '/' + id
    return new DocRefMock(path)
  }

  add(data: any) {
    const id = 'auto-' + Math.random().toString(36).slice(2)
    const path = this._collectionPath + '/' + id
    store[path] = data
    return Promise.resolve({ id })
  }
}

class DocRefMock {
  constructor(private path: string) {}

  async get() {
    const data = store[this.path]
    return {
      id: this.path.split('/').pop(),
      exists: !!data,
      data: () => data ?? null,
      ref: this,
    }
  }

  async set(data: any, opts?: any) {
    if (opts?.merge) {
      store[this.path] = { ...(store[this.path] ?? {}), ...data }
    } else {
      store[this.path] = data
    }
  }

  async update(data: any) {
    if (!store[this.path]) throw Object.assign(new Error('NOT_FOUND'), { code: 5 })
    store[this.path] = { ...store[this.path], ...data }
  }

  async create(data: any) {
    if (store[this.path]) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 })
    store[this.path] = data
  }

  async delete() {
    delete store[this.path]
  }

  collection(sub: string) {
    return new QueryMock(this.path + '/' + sub)
  }
}

// Top-level mock
export const mockAdminDb = {
  collection: (name: string) => new QueryMock(name),
  doc: (path: string) => new DocRefMock(path),
  batch: () => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  }),
  runTransaction: async (fn: (tx: any) => Promise<any>) => {
    // Simple transaction mock — runs synchronously
    const tx = {
      get: async (ref: any) => ref.get(),
      set: (ref: any, data: any, opts?: any) => {
        if (opts?.merge) {
          store[ref.path] = { ...(store[ref.path] ?? {}), ...data }
        } else {
          store[ref.path] = data
        }
      },
      update: (ref: any, data: any) => {
        store[ref.path] = { ...(store[ref.path] ?? {}), ...data }
      },
    }
    return fn(tx)
  },
}

export const mockAdminAuth = {
  verifySessionCookie: jest.fn().mockResolvedValue({ uid: 'test-agent-uid' }),
  verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-agent-uid' }),
  createSessionCookie: jest.fn().mockResolvedValue('test-session-cookie'),
  revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  createUser: jest.fn().mockResolvedValue({ uid: 'new-agent-uid' }),
  updateUser: jest.fn().mockResolvedValue(undefined),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  generatePasswordResetLink: jest.fn().mockResolvedValue('https://reset.link'),
}
