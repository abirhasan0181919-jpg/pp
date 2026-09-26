import { useState } from 'react'
import Billing from './components/Billing'
import Login from './components/Login'
import Receipt from './components/Receipt'
import TodayBills from './components/TodayBills'
import type { Sale } from './lib/invoice'
import { clearSession, loadSession } from './lib/session'
import type { Session } from './lib/types'

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [view, setView] = useState<'billing' | 'bills'>('billing')
  const [sale, setSale] = useState<Sale | null>(null)

  function logout() {
    clearSession()
    setSession(null)
    setSale(null)
  }

  if (!session) return <Login onLogin={setSession} />

  if (sale) {
    return (
      <Receipt
        sale={sale}
        onClose={() => {
          setSale(null)
          setView('billing')
        }}
      />
    )
  }

  if (view === 'bills') {
    return (
      <TodayBills
        session={session}
        onReprint={setSale}
        onBack={() => setView('billing')}
      />
    )
  }

  return (
    <Billing
      session={session}
      onShowBills={() => setView('bills')}
      onPrinted={setSale}
      onLogout={logout}
    />
  )
}
