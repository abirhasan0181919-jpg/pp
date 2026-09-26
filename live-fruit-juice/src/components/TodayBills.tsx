import { useCallback, useEffect, useState } from 'react'
import { dateBn, money, toBnDigits } from '../lib/bn'
import { fetchInvoice, fetchTodayInvoices, type Sale } from '../lib/invoice'
import type { Invoice, Session } from '../lib/types'

export default function TodayBills({
  session,
  onReprint,
  onBack,
}: {
  session: Session
  onReprint: (sale: Sale) => void
  onBack: () => void
}) {
  const [rows, setRows] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [allStaff, setAllStaff] = useState(false)
  const isOwner = session.role === 'owner'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchTodayInvoices(session.username, allStaff))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বিল লোড করা যায়নি')
    } finally {
      setLoading(false)
    }
  }, [session.username, allStaff])

  useEffect(() => {
    load()
  }, [load])

  async function reprint(no: string) {
    try {
      onReprint(await fetchInvoice(no))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বিল পাওয়া যায়নি')
    }
  }

  const sum = rows.reduce((s, r) => s + Number(r.total), 0)

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong>আজকের বিলসমূহ</strong>
          <span className="who">{dateBn()}</span>
        </div>
        <div className="actions">
          <button onClick={load}>রিফ্রেশ</button>
          <button onClick={onBack}>বিলিং</button>
        </div>
      </header>

      {isOwner && (
        <label className="owner-toggle">
          <input
            type="checkbox"
            checked={allStaff}
            onChange={(e) => setAllStaff(e.target.checked)}
          />
          সব স্টাফের বিল দেখুন
        </label>
      )}

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : rows.length === 0 ? (
        <p className="muted">আজকের কোনো বিল পাওয়া যায়নি।</p>
      ) : (
        <div className="panel">
          <table className="bills">
            <thead>
              <tr>
                <th>বিল নং</th>
                <th>সময়</th>
                <th>কাস্টমার</th>
                <th>সেলার</th>
                <th>মোট</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.invoice_no}>
                  <td>{r.invoice_no}</td>
                  <td>{r.time_disp}</td>
                  <td>{r.customer}</td>
                  <td>{r.seller}</td>
                  <td>{toBnDigits(money(r.total))}</td>
                  <td>
                    <button onClick={() => reprint(r.invoice_no)}>প্রিন্ট</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4}>মোট</th>
                <th>{toBnDigits(money(sum))}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
