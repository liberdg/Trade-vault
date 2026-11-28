import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/trade-vault/**', '**/.next/**'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
