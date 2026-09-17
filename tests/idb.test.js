import { describe, it, expect, beforeEach } from 'vitest'

const { openDB, putJob, getAllJobs, deleteJob, clearJobs } = await import('../src/lib/idb.js')

describe('idb — basic CRUD', () => {
  beforeEach(() => {
    globalThis.indexedDB = undefined
    delete require.cache[require.resolve('../src/lib/idb.js')]
  })

  it('openDB returns a database', async () => {
    globalThis.indexedDB = makeFakeIDB()
    const db = await openDB()
    expect(db).toBeTruthy()
    expect(db.objectStoreNames).toBeTruthy()
  })

  it('putJob stores a job and getAllJobs returns it', async () => {
    globalThis.indexedDB = makeFakeIDB()
    await putJob({ id: 'job-1', name: 'a.png', status: 'done' })
    const all = await getAllJobs()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('a.png')
  })

  it('getAllJobs on empty store returns []', async () => {
    globalThis.indexedDB = makeFakeIDB()
    const all = await getAllJobs()
    expect(all).toEqual([])
  })

  it('putJob with same id overwrites', async () => {
    globalThis.indexedDB = makeFakeIDB()
    await putJob({ id: 'job-1', name: 'a.png', status: 'done' })
    await putJob({ id: 'job-1', name: 'a.png', status: 'error', error: 'fail' })
    const all = await getAllJobs()
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe('error')
  })

  it('deleteJob removes by id', async () => {
    globalThis.indexedDB = makeFakeIDB()
    await putJob({ id: 'job-1', name: 'a.png' })
    await putJob({ id: 'job-2', name: 'b.jpg' })
    await deleteJob('job-1')
    const all = await getAllJobs()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('job-2')
  })

  it('clearJobs empties the store', async () => {
    globalThis.indexedDB = makeFakeIDB()
    await putJob({ id: 'job-1', name: 'a.png' })
    await putJob({ id: 'job-2', name: 'b.jpg' })
    await clearJobs()
    const all = await getAllJobs()
    expect(all).toEqual([])
  })

  it('clearJobs on empty store is idempotent', async () => {
    globalThis.indexedDB = makeFakeIDB()
    await clearJobs()
    await clearJobs()
    expect(await getAllJobs()).toEqual([])
  })

  it('deleteJob on missing id is idempotent', async () => {
    globalThis.indexedDB = makeFakeIDB()
    await deleteJob('nope')
    expect(await getAllJobs()).toEqual([])
  })
})

describe('idb — error handling', () => {
  it('openDB rejects when indexedDB is undefined', async () => {
    globalThis.indexedDB = undefined
    await expect(openDB()).rejects.toThrow(/IndexedDB unavailable/)
  })
})

function makeFakeIDB() {
  const stores = new Map()
  let db = null

  const objectStore = {
    put: (value) => makeReq(() => {
      stores.get('jobs').set(value.id, value)
      return value.id
    }),
    get: (key) => makeReq(() => stores.get('jobs').get(key)),
    getAll: () => makeReq(() => Array.from(stores.get('jobs').values())),
    delete: (key) => makeReq(() => stores.get('jobs').delete(key)),
    clear: () => makeReq(() => stores.get('jobs').clear())
  }

  function makeReq(op) {
    const r = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null
    }
    queueMicrotask(() => {
      try {
        r.result = op()
        r.onsuccess?.()
      } catch (e) {
        r.error = e
        r.onerror?.()
      }
    })
    return r
  }

  return {
    open: () => {
      if (!stores.has('jobs')) stores.set('jobs', new Map())
      const r = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      }
      queueMicrotask(() => {
        db = {
          objectStoreNames: { contains: () => stores.has('jobs') },
          transaction: () => ({
            objectStore: () => objectStore
          })
        }
        r.result = db
        r.onupgradeneeded?.()
        r.onsuccess?.()
      })
      return r
    }
  }
}
