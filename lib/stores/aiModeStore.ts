import { create } from 'zustand'

interface AIModeStore {
  // Per-conversation AI mode state (mirrors Firestore but gives instant UI feedback)
  modes: Record<string, boolean>
  setMode(conversationId: string, enabled: boolean): void
  getMode(conversationId: string): boolean | undefined
}

export const useAIModeStore = create<AIModeStore>((set, get) => ({
  modes: {},
  setMode(conversationId, enabled) {
    set(state => ({ modes: { ...state.modes, [conversationId]: enabled } }))
  },
  getMode(conversationId) {
    return get().modes[conversationId]
  },
}))
