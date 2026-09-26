import { useEffect } from 'react'
import { money, SHOP_NAME, SHOP_TAGLINE, toBnDigits } from '../lib/bn'
import type { Sale } from '../lib/invoice'
import type { Size } from '../lib/types'

const SIZE_BN: Record<string, string> = { S: 'ছোট', M: 'মাঝারি', L: 'বড়' }

export default function Receipt({
  sale,
  onClose,
}: {
  sale: Sale
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 250)
    return () => clearTimeout(t)
  }, [sale])

  const { invoice, items } = sale
  const due = Number(invoice.change) < 0

  return (
    <div className="print-layer">
      <div className="receipt">
        <h1>{SHOP_NAME}</h1>
        <p className="tagline">{SHOP_TAGLINE}</p>
        <p className="meta">ঠিকানা: দোকান কাউন্টার</p>
        <div className="hr" />

        <table>
          <tbody>
            <tr>
              <td>সিরিয়াল</td>
              <td className="r">{toBnDigits(invoice.invoice_no)}</td>
            </tr>
            <tr>
              <td>তারিখ</td>
              <td className="r">{invoice.date_disp}</td>
            </tr>
            <tr>
              <td>সময়</td>
              <td className="r">{invoice.time_disp}</td>
            </tr>
            <tr>
              <td>কাস্টমার</td>
              <td className="r">{invoice.customer}</td>
            </tr>
            <tr>
              <td>সার্ভ করেছেন</td>
              <td className="r">{invoice.seller}</td>
            </tr>
          </tbody>
        </table>

        <div className="hr" />

        <table className="items">
          <thead>
            <tr>
              <th>পণ্য</th>
              <th className="r">পরিমাণ</th>
              <th className="r">দাম</th>
              <th className="r">মোট</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.item}
                  <span className="size">
                    {' '}
                    ({SIZE_BN[i.size as Size] ?? i.size})
                  </span>
                </td>
                <td className="r">{toBnDigits(i.qty)}</td>
                <td className="r">{toBnDigits(money(i.price))}</td>
                <td className="r">{toBnDigits(money(Number(i.qty) * Number(i.price)))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="hr" />

        <table>
          <tbody>
            <tr className="grand">
              <td>সর্বমোট</td>
              <td className="r">{toBnDigits(money(invoice.total))}</td>
            </tr>
            <tr>
              <td>পরিশোধিত</td>
              <td className="r">{toBnDigits(money(invoice.paid))}</td>
            </tr>
            <tr className="grand">
              <td>{due ? 'বাকি' : 'ফেরত'}</td>
              <td className="r">{toBnDigits(money(Math.abs(Number(invoice.change))))}</td>
            </tr>
          </tbody>
        </table>

        <div className="hr" />
        <p className="thanks">ধন্যবাদ! আবার আসবেন</p>
      </div>

      <div className="print-actions">
        <button className="primary" onClick={() => window.print()}>
          আবার প্রিন্ট
        </button>
        <button onClick={onClose}>বিলিং-এ ফিরে যান</button>
      </div>
    </div>
  )
}
