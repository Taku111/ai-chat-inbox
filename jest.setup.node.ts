// Node environment setup (integration + unit tests)
// No @testing-library/jest-dom — that's jsdom only

import { server } from './tests/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
