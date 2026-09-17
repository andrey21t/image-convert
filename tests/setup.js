import { vi, beforeEach } from 'vitest'

beforeEach(() => {
  if (!globalThis.URL.createObjectURL) {
    globalThis.URL.createObjectURL = vi.fn(
      (obj) => `blob:mock-${Math.random().toString(36).slice(2)}`
    )
  }
  if (!globalThis.URL.revokeObjectURL) {
    globalThis.URL.revokeObjectURL = vi.fn()
  }
  if (!globalThis.crypto?.randomUUID) {
    globalThis.crypto = {
      ...globalThis.crypto,
      randomUUID: () => '00000000-0000-4000-8000-000000000000'
    }
  }
})
