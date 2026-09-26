import { supabase } from './supabase'
import type { Session } from './types'

const SALT = (import.meta.env.VITE_PASSWORD_SALT as string | undefined) ?? 'livefruitjuice_salt_'
const STORAGE_KEY = 'lfj.session'

/** SHA256(salt + password) as lowercase hex — must match the desktop app. */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function login(username: string, password: string): Promise<Session> {
  const hash = await hashPassword(password)
  const { data, error } = await supabase
    .from('employees')
    .select('username, password_hash, role')
    .eq('username', username.trim())
    .maybeSingle()

  if (error) throw new Error('সার্ভারের সাথে সংযোগ ব্যর্থ। ইন্টারনেট দেখুন।')
  if (!data || data.password_hash !== hash) {
    throw new Error('ইউজারনেম বা পাসওয়ার্ড ভুল')
  }

  const session: Session = { username: data.username, role: data.role }
  saveSession(session)
  return session
}
