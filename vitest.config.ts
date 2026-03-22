import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    // If you need to test the main process, ensure you include relevant paths
    include: ['tests/**/*.{test,spec}.ts'],
  }
})
