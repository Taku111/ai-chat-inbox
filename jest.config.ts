import type { Config } from 'jest'

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  testEnvironmentOptions: {
    // Force CJS exports resolution for all packages (msw/node uses CJS via 'require' condition)
    customExportConditions: ['node', 'require', 'default'],
  },
  transform: {
    '^.+\\.(ts|tsx|mts)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      useESM: false,
    }],
  },
  transformIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // uuid v14 is ESM-only — redirect to CJS mock for tests
    '^uuid$': '<rootDir>/tests/mocks/uuid.ts',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.ts',
    '\\.(jpg|jpeg|png|gif|svg|ico)$': '<rootDir>/tests/mocks/fileMock.ts',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 80, statements: 80 },
    './lib/ai/': { branches: 85, functions: 90, lines: 90, statements: 90 },
    './app/api/webhooks/': { branches: 85, functions: 90, lines: 90, statements: 90 },
  },
}

export default config
