const ALGORITHM = 'AES-GCM'
const KEY_STORAGE_ID = 'setting/encryption-key'

async function getOrCreateKey(): Promise<CryptoKey> {
  const settingsRepo = await import('@/db/settings.repo')
  const stored = settingsRepo.get('encryption-key')
  if (stored) {
    const keyData = base64ToBytes(stored)
    return crypto.subtle.importKey('raw', keyData, ALGORITHM, false, ['encrypt', 'decrypt'])
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  settingsRepo.set('encryption-key', bytesToBase64(new Uint8Array(exported)))
  return key
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)

  // Combine iv + ciphertext, base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return bytesToBase64(combined)
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getOrCreateKey()
  const combined = base64ToBytes(ciphertext)
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data)
  return new TextDecoder().decode(decrypted)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
