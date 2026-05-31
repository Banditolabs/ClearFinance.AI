import { ipcMain } from 'electron'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { getDb } from '../db/sqliteClient'

const scryptAsync = promisify(scrypt)

// --- Helpers (you implement these) ---

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer

  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, keyHex] = stored.split(':')
    const salt = Buffer.from(saltHex, 'hex')
    const storedKey = Buffer.from(keyHex, 'hex')
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer

    return timingSafeEqual(storedKey, derivedKey)
  } catch {
    return false
  }
}

function generateToken(): string {
  // Return a 64-char hex string (32 random bytes)
  return randomBytes(32).toString('hex');
}
// --- IPC Handlers ---

export function registerAuthHandlers(): void {
  ipcMain.handle('profile:create', async (_event, name: string, email: string, password: string, intent?: string) => {
    const db = getDb()
    const firstProfile = db.prepare('SELECT * FROM profiles LIMIT 1').get()
    const expiresAt = now + (7 * 24 * 60 * 60) // 7 days from now


    const isFirstProfile = !firstProfile

    const passwordHash = await hashPassword(password)

    // TODO: Branch on isFirstProfile:
    //   true  → create household, insert admin profile, create session, log audit event
    //           return { type: 'admin', profile, sessionToken, recoveryCode }
    //   false → insert pending member profile, log audit event
    //           return { type: 'pending' }
    if (isFirstProfile) {
      const now = Math.floor(Date.now() / 1000)

      const houseHold = db.prepare('INSERT INTO households DEFAULT VALUES ')
      const profile = db.prepare('INSERT INTO profiles (id, name) VALUES (@id, @name)').run({ id: '...', name: '...' })
      const session = db.prepare('INSERT INTO sessions (id, profile_id, ) VALUES (generateToken(), profile.id, expiresAt)')


    }
  })


  ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
    // TODO: Fetch profile by email
    // TODO: Check status === 'pending' → return { success: false, error: 'pending' }
    // TODO: Check locked_until
    // TODO: Verify password
    //   fail → increment failed_login_attempts, lock if >= 5
    //   pass → reset attempts, create session, log audit event
    // TODO: Return { success, profile, sessionToken } or { success: false, error, lockedUntil? }
  })

  ipcMain.handle('auth:logout', async (_event, sessionToken: string) => {
    // TODO: Delete session row, log audit event
  })

  ipcMain.handle('auth:validate-session', async (_event, sessionToken: string) => {
    // TODO: Fetch session by token
    // TODO: Check expires_at > now
    // TODO: Update last_active_at
    // TODO: Return { valid: true, profile } or { valid: false }
  })
}
