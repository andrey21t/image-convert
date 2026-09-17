const DB_NAME = 'image-convert'
const DB_VERSION = 1
const STORE_NAME = 'jobs'

/**
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IDB open failed'))
    req.onblocked = () => reject(new Error('IDB open blocked'))
  })
}

async function tx(mode) {
  const db = await openDB()
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

/**
 * @param {Object} job
 * @returns {Promise<void>}
 */
export async function putJob(job) {
  const store = await tx('readwrite')
  return new Promise((resolve, reject) => {
    const req = store.put(job)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * @returns {Promise<Object[]>}
 */
export async function getAllJobs() {
  const store = await tx('readonly')
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteJob(id) {
  const store = await tx('readwrite')
  return new Promise((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/**
 * @returns {Promise<void>}
 */
export async function clearJobs() {
  const store = await tx('readwrite')
  return new Promise((resolve, reject) => {
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
