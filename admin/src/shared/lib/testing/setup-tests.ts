/// <reference types="node" />
import { webcrypto } from 'node:crypto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { server } from './server'

// jsdom has no layout observer; sorting geometry is checked in a real browser.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

vi.stubGlobal('crypto', webcrypto)
URL.createObjectURL = vi.fn(() => 'blob:test-preview')
URL.revokeObjectURL = vi.fn()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
