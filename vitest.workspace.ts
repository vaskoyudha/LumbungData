import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/db/vitest.config.ts',
  'packages/p2p/vitest.config.ts',
  'packages/blockchain/vitest.config.ts',
])
