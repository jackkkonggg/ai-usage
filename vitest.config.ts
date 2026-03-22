import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// Pin timezone for deterministic date/time tests across all environments
process.env.TZ = 'UTC'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/__tests__/**',
        'src/lib/__fixtures__/**',
        'src/lib/design-tokens.ts',
        'src/lib/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
