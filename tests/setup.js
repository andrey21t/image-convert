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

const STORES = new Map()
let dbInstance = null

class FakeRequest {
  constructor(operation) {
    this.operation = operation
    this.result = undefined
    this.error = null
    this.onsuccess = null
    this.onerror = null
    queueMicrotask(() => {
      try {
        this.result = operation()
        this.onsuccess?.()
      } catch (err) {
        this.error = err
        this.onerror?.()
      }
    })
  }
}

class FakeObjectStore {
  constructor(name) {
    this.name = name
    if (!STORES.has(name)) STORES.set(name, new Map())
  }

  put(value) {
    return new FakeRequest(() => {
      STORES.get(this.name).set(value.id, value)
      return value.id
    })
  }

  get(key) {
    return new FakeRequest(() => STORES.get(this.name).get(key))
  }

  getAll() {
    return new FakeRequest(() => Array.from(STORES.get(this.name).values()))
  }

  delete(key) {
    return new FakeRequest(() => {
      STORES.get(this.name).delete(key)
    })
  }

  clear() {
    return new FakeRequest(() => {
      STORES.get(this.name).clear()
    })
  }
}

class FakeTransaction {
  constructor(storeName, mode) {
    this.store = new FakeObjectStore(storeName)
    this.mode = mode
  }

  objectStore(name) {
    return this.store
  }
}

class FakeDatabase {
  constructor() {
    this.objectStoreNames = { contains: () => STORES.has(STORE_NAME) }
  }

  transaction(storeName, mode) {
    return new FakeTransaction(storeName, mode)
  }
}

class FakeIDBOpenRequest {
  constructor() {
    this.result = null
    this.error = null
    this.onsuccess = null
    this.onerror = null
    this.onupgradeneeded = null
    queueMicrotask(() => {
      if (!dbInstance) {
        dbInstance = new FakeDatabase()
        if (!STORES.has('jobs')) STORES.set('jobs', new Map())
      }
      this.result = dbInstance
      this.onupgradeneeded?.()
      this.onsuccess?.()
    })
  }
}

const STORE_NAME = 'jobs'

beforeEach(() => {
  if (typeof globalThis.indexedDB === 'undefined') {
    globalThis.indexedDB = {
      open: () => new FakeIDBOpenRequest()
    }
  }
  STORES.clear()
  dbInstance = null
})
