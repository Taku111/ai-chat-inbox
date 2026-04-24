import { buildSuggestionPrompt, buildAutonomousPrompt, buildMessagesForAI } from '@/lib/ai/prompts'

const baseCtx = {
  businessName: 'Bexley School',
  businessDescription: 'A school in Zimbabwe',
  customSystemPrompt: '',
  knowledgeBaseEntries: [] as any[],
  contact: { displayName: 'Mrs Moyo' },
  recentMessages: [] as any[],
  tokenBudget: 8000,
}

describe('buildSuggestionPrompt', () => {
  it('includes business name', () => {
    const prompt = buildSuggestionPrompt(baseCtx)
    expect(prompt).toContain('Bexley School')
  })

  it('includes customer name', () => {
    const prompt = buildSuggestionPrompt(baseCtx)
    expect(prompt).toContain('Mrs Moyo')
  })

  it('includes KB placeholder when no entries', () => {
    const prompt = buildSuggestionPrompt(baseCtx)
    expect(prompt).toContain('No knowledge base entries configured')
  })

  it('sorts KB by priority — P1 always included', () => {
    const entries: any[] = [
      { id: '1', title: 'Low', content: 'low priority', priority: 5, isActive: true },
      { id: '2', title: 'High', content: 'critical info', priority: 1, isActive: true },
    ]
    const prompt = buildSuggestionPrompt({ ...baseCtx, knowledgeBaseEntries: entries })
    // P1 entry should appear before P5 in the prompt
    expect(prompt.indexOf('High')).toBeLessThan(prompt.indexOf('Low'))
  })

  it('excludes inactive KB entries', () => {
    const entries: any[] = [
      { id: '1', title: 'Active', content: 'visible', priority: 1, isActive: true },
      { id: '2', title: 'Inactive', content: 'hidden', priority: 1, isActive: false },
    ]
    const prompt = buildSuggestionPrompt({ ...baseCtx, knowledgeBaseEntries: entries })
    expect(prompt).not.toContain('Inactive')
    expect(prompt).toContain('Active')
  })

  it('requests quickOptions in the prompt', () => {
    const prompt = buildSuggestionPrompt(baseCtx)
    expect(prompt).toContain('quickOptions')
  })

  it('truncates KB when over token budget', () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      title: `Entry ${i}`,
      content: 'x'.repeat(500),
      priority: i + 1,
      isActive: true,
    }))
    const prompt = buildSuggestionPrompt({ ...baseCtx, knowledgeBaseEntries: entries })
    // The prompt should be finite and not contain ALL entries
    expect(prompt.length).toBeLessThan(entries.length * 510)
  })
})

describe('buildAutonomousPrompt', () => {
  it('includes caution warning', () => {
    const prompt = buildAutonomousPrompt(baseCtx)
    expect(prompt.toLowerCase()).toContain('automatically')
  })

  it('extends the suggestion prompt', () => {
    const suggestion = buildSuggestionPrompt(baseCtx)
    const autonomous = buildAutonomousPrompt(baseCtx)
    // Autonomous prompt should be longer
    expect(autonomous.length).toBeGreaterThan(suggestion.length)
  })
})

describe('buildMessagesForAI', () => {
  it('maps inbound direction to user role', () => {
    const msgs = [{ body: 'Hello', sentAt: { toMillis: () => 0 } as any, direction: 'inbound' as const, sender: 'contact' as const }]
    const result = buildMessagesForAI(msgs)
    expect(result[0]?.role).toBe('user')
  })

  it('maps outbound direction to assistant role', () => {
    const msgs = [{ body: 'Hi there', sentAt: { toMillis: () => 0 } as any, direction: 'outbound' as const, sender: 'agent' as const }]
    const result = buildMessagesForAI(msgs)
    expect(result[0]?.role).toBe('assistant')
  })

  it('returns empty array for empty input', () => {
    expect(buildMessagesForAI([])).toEqual([])
  })
})
