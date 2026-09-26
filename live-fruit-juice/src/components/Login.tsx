import { useState } from 'react'
import type { FormEvent } from 'react'
import { login } from '../lib/session'
import { isConfigured } from '../lib/supabase'
import { SHOP_NAME, SHOP_TAGLINE, dateBn } from '../lib/bn'

export default function Login({ onLogin }: { onLogin: (s: { username: string; role: string }) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('ইউজারনেম ও পাসওয়ার্ড দিন')
      return
    }
    setBusy(true)
    try {
      const session = await login(username, password)
      onLogin(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন করা যায়নি')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">🥤</div>
        <h1>{SHOP_NAME}</h1>
        <p className="tagline">{SHOP_TAGLINE}</p>
        <p className="today">{dateBn()}</p>

        {!isConfigured && (
          <div className="alert">
            Supabase সেটআপ হয়নি। প্রজেক্ট রুটে <code>.env</code> ফাইলে{' '}
            <code>VITE_SUPABASE_URL</code> ও <code>VITE_SUPABASE_ANON_KEY</code> দিন।
          </div>
        )}

        <label htmlFor="username">ইউজারনেম</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
        />

        <label htmlFor="password">পাসওয়ার্ড</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <div className="error">{error}</div>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'যাচাই হচ্ছে…' : 'লগইন করুন'}
        </button>
        <p className="hint">অ্যাকাউন্ট শুধু ডেস্কটপ অ্যাপ থেকে তৈরি হয়।</p>
      </form>
    </div>
  )
}
