/**
 * File storage abstraction. AppState holds attachment metadata only; the bytes
 * go through a FileStorageAdapter. Swap `fileStorage` for a cloud adapter
 * (e.g. Supabase Storage) later without touching UI or domain code.
 */

export interface FileStorageAdapter {
  readonly provider: 'indexeddb' | 'remote'
  save(key: string, file: Blob): Promise<void>
  get(key: string): Promise<Blob | null>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

const DB_NAME = 'student-os-files'
const STORE = 'files'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Local file storage is not available in this browser.'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Could not open local file storage.'))
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      let result: T
      req.onsuccess = () => {
        result = req.result
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error ?? req.error)
      tx.onabort = () => reject(tx.error ?? req.error)
    })
  } finally {
    db.close()
  }
}

export const indexedDbStorage: FileStorageAdapter = {
  provider: 'indexeddb',
  async save(key, file) {
    await run('readwrite', (s) => s.put(file, key))
  },
  async get(key) {
    const v = await run<Blob | undefined>('readonly', (s) => s.get(key))
    return v ?? null
  },
  async delete(key) {
    await run('readwrite', (s) => s.delete(key))
  },
  async exists(key) {
    const n = await run<number>('readonly', (s) => s.count(key))
    return n > 0
  },
}

export const fileStorage: FileStorageAdapter = indexedDbStorage

export function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
}
