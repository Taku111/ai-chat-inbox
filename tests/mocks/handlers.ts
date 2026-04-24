import { http, HttpResponse } from 'msw'

export const handlers = [
  // Claude API
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: '{"reply": "Thank you for your message.", "quickOptions": ["Yes", "No", "Call us"]}' }],
      model: 'claude-haiku-4-5-20251001',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
    })
  }),

  // Claude API timeout simulation (route matched by special header)
  http.post('https://api.anthropic.com/v1/messages', ({ request }) => {
    if (request.headers.get('x-test-timeout') === 'true') {
      return new Promise(() => {}) // Never resolves — simulates timeout
    }
    return undefined // Fall through to default handler
  }),

  // OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      choices: [{
        message: { role: 'assistant', content: '{"reply": "Thank you for your message.", "quickOptions": ["Yes", "No", "Call us"]}' },
        finish_reason: 'stop',
        index: 0,
      }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    })
  }),

  // Twilio send message
  http.post('https://api.twilio.com/2010-04-01/Accounts/:sid/Messages.json', () => {
    return HttpResponse.json({
      sid: 'SM_test_twilio_sid',
      status: 'queued',
      body: 'Test message',
    })
  }),
]
