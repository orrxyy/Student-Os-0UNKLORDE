import { supabase } from './supabase'

export interface FileStorageAdapter {
  readonly provider: 'indexeddb' | 'remote'
  save(key: string, file: Blob): Promise<void>
  get(key: string): Promise<Blob | null>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

const DB_NAME = 'student-os-files'
const STORE = 'files'
const BUCKET = 'student-attachments'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('Local file storage is not available in this browser.'))
    }

    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Could not open local file storage.'))
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()

  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = fn(tx.objectStore(STORE))
      let result: T

      request.onsuccess = () => {
        result = request.result
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error ?? request.error)
      tx.onabort = () => reject(tx.error ?? request.error)
    })
  } finally {
    db.close()
  }
}

export const indexedDbStorage: FileStorageAdapter = {
  provider: 'indexeddb',

  async save(key, file) {
    await run('readwrite', (store) => store.put(file, key))
  },

  async get(key) {
    const result = await run<Blob | undefined>('readonly', (store) => store.get(key))
    return result ?? null
  },

  async delete(key) {
    await run('readwrite', (store) => store.delete(key))
  },

  async exists(key) {
    const count = await run<number>('readonly', (store) => store.count(key))
    return count > 0
  },
}

async function remotePath(key: string): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in to manage attachments.')
  return `${data.user.id}/${key}`
}

export const remoteFileStorage: FileStorageAdapter = {
  provider: 'remote',

  async save(key, file) {
    const path = await remotePath(key)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) throw error
  },

  async get(key) {
    const path = await remotePath(key)
    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (error) throw error
    return data
  },

  async delete(key) {
    const path = await remotePath(key)
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  },

  async exists(key) {
    try {
      return (await this.get(key)) !== null
    } catch {
      return false
    }
  },
}

// Keep the existing IndexedDB adapter available for old local-only attachments.
export const fileStorage = indexedDbStorage

export function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.code === 22)
}
