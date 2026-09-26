import { useEffect, useMemo, useRef, useState } from 'react'
import { money } from '../lib/bn'
import { saveSale, type Sale } from '../lib/invoice'
import { supabase } from '../lib/supabase'
import type { CartLine, Product, Session, Size } from '../lib/types'

const SIZES: Size[] = ['S', 'M', 'L']
const SIZE_BN: Record<Size, string> = { S: 'ছোট', M: 'মাঝারি', L: 'বড়' }

function priceOf(p: Product, size: Size): number | null {
  const v = size === 'S' ? p.price_s : size === 'M' ? p.price_m : p.price_l
  return v === null || v === undefined ? null : Number(v)
}

export default function Billing({
  session,
  onShowBills,
  onPrinted,
  onLogout,
}: {
  session: Session
  onShowBills: () => void
  onPrinted: (sale: Sale) => void
  onLogout: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [selected, setSelected] = useState<{ product: Product; size: Size } | null>(null)
  const [qty, setQty] = useState('1')
  const [customer, setCustomer] = useState('')
  const [paid, setPaid] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const paidTouched = useRef(false)

  useEffect(() => {
    let active = true

    async function load() {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })
      if (!active) return
      if (err) setLoadError('পণ্য লোড করা যায়নি: ' + err.message)
      else {
        setProducts((data ?? []) as Product[])
        setLoadError('')
      }
    }

    load()

    const channel = supabase
      .channel('products-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  const total = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart])
  const paidValue = paidTouched.current ? Number(paid || 0) : total
  const diff = paidValue - total

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  function pick(product: Product, size: Size) {
    setError('')
    setSelected({ product, size })
    setQty('1')
  }

  function addSelected() {
    if (!selected) return
    const n = Math.floor(Number(qty))
    if (!n || n < 1) {
      setError('পরিমাণ ১ বা তার বেশি দিন')
      return
    }
    const price = priceOf(selected.product, selected.size)
    if (price === null) {
      setError('এই সাইজে পণ্যটি নেই')
      return
    }
    setCart((prev) => {
      const key = `${selected.product.id}-${selected.size}`
      const found = prev.find((l) => l.key === key)
      if (found) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + n } : l))
      }
      return [
        ...prev,
        {
          key,
          productId: selected.product.id,
          item: selected.product.name,
          size: selected.size,
          qty: n,
          price,
        },
      ]
    })
    setSelected(null)
  }

  function changeQty(key: string, value: number) {
    setCart((prev) =>
      value <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty: Math.floor(value) } : l)),
    )
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  async function complete() {
    if (!cart.length) {
      setError('কার্ট খালি')
      return
    }
    setError('')
    setBusy(true)
    try {
      const sale = await saveSale({
        cart,
        customer,
        seller: session.username,
        paid: paidTouched.current ? Number(paid || 0) : total,
      })
      setCart([])
      setCustomer('')
      setPaid('')
      paidTouched.current = false
      setSelected(null)
      onPrinted(sale)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বিল সেভ হয়নি')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong>Live Fruit Juice</strong>
          <span className="who">
            {session.username} · {session.role === 'owner' ? 'মালিক' : 'স্টাফ'}
          </span>
        </div>
        <div className="actions">
          <button onClick={onShowBills}>আজকের বিলসমূহ</button>
          <button onClick={onLogout}>লগআউট</button>
        </div>
      </header>

      {loadError && <div className="alert">{loadError}</div>}

      <div className="billing-grid">
        <section className="panel products">
          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="পণ্য খুঁজুন…"
          />
          <div className="product-list">
            {filtered.length === 0 && <p className="muted">কোনো পণ্য পাওয়া যায়নি।</p>}
            {filtered.map((p) => (
              <div className="product" key={p.id}>
                <div className="pname">{p.name}</div>
                <div className="sizes">
                  {SIZES.map((s) => {
                    const price = priceOf(p, s)
                    const isSel = selected?.product.id === p.id && selected.size === s
                    return (
                      <button
                        key={s}
                        className={isSel ? 'size sel' : 'size'}
                        disabled={price === null}
                        onClick={() => pick(p, s)}
                      >
                        <b>{SIZE_BN[s]}</b>
                        <span>{price === null ? '—' : money(price)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="addbar">
              <span>
                {selected.product.name} — {SIZE_BN[selected.size]}
              </span>
              <div className="qty">
                <button onClick={() => setQty(String(Math.max(1, Math.floor(Number(qty) || 1) - 1)))}>−</button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                <button onClick={() => setQty(String(Math.floor(Number(qty) || 0) + 1))}>+</button>
              </div>
              <button className="primary" onClick={addSelected}>
                কার্টে যোগ করো
              </button>
              <button onClick={() => setSelected(null)}>বাতিল</button>
            </div>
          )}
        </section>

        <section className="panel cart">
          <h2>বিল</h2>
          {cart.length === 0 ? (
            <p className="muted">কার্ট খালি আছে।</p>
          ) : (
            <table className="cart-table">
              <thead>
                <tr>
                  <th>পণ্য</th>
                  <th>সাইজ</th>
                  <th>পরিমাণ</th>
                  <th>দাম</th>
                  <th>মোট</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => (
                  <tr key={l.key}>
                    <td>{l.item}</td>
                    <td>{SIZE_BN[l.size]}</td>
                    <td>
                      <input
                        className="qty-input"
                        type="number"
                        min="1"
                        value={l.qty}
                        onChange={(e) => changeQty(l.key, Number(e.target.value))}
                      />
                    </td>
                    <td>{money(l.price)}</td>
                    <td>{money(l.price * l.qty)}</td>
                    <td>
                      <button className="del" onClick={() => removeLine(l.key)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <label className="field">
            <span>কাস্টমারের নাম (ঐচ্ছিক)</span>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Walk-in Customer"
            />
          </label>

          <div className="total-box">
            <div>
              <span>সর্বমোট</span>
              <b>{money(total)}</b>
            </div>
            <label className="field">
              <span>কত টাকা দিয়েছেন</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paid}
                placeholder={money(total)}
                onFocus={() => (paidTouched.current = true)}
                onChange={(e) => {
                  paidTouched.current = true
                  setPaid(e.target.value)
                }}
              />
            </label>
            <div className={diff >= 0 ? 'diff change' : 'diff due'}>
              <span>{diff >= 0 ? 'ফেরত' : 'বাকি'}</span>
              <b>{money(Math.abs(diff))}</b>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <button className="primary big" onClick={complete} disabled={busy || !cart.length}>
            {busy ? 'সেভ হচ্ছে…' : 'বিল সম্পন্ন করো ও প্রিন্ট করো'}
          </button>
        </section>
      </div>
    </div>
  )
}
