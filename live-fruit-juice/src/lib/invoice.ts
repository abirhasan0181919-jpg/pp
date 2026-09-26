import { supabase } from './supabase'
import { dateBn, timeBn } from './bn'
import type { CartLine, Invoice, InvoiceItem } from './types'

export interface SaleInput {
  cart: CartLine[]
  customer: string
  seller: string
  paid: number
}

export interface Sale {
  invoice: Invoice
  items: InvoiceItem[]
}

const money2 = (n: number) => Number(n.toFixed(2))

function dayStamp(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${String(d.getFullYear()).slice(2)}${m}${day}`
}

async function nextCounter(): Promise<number> {
  const start = startOfToday()
  const end = startOfTomorrow()
  const { count, error } = await supabase
    .from('invoices')
    .select('invoice_no', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end)
  if (error) throw new Error('বিল নম্বর তৈরি করা যায়নি')
  return (count ?? 0) + 1
}

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfTomorrow(): string {
  const d = startOfTodayDate()
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}

function startOfTodayDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function saveSale({ cart, customer, seller, paid }: SaleInput): Promise<Sale> {
  const subtotal = money2(cart.reduce((s, l) => s + l.price * l.qty, 0))
  const total = subtotal
  const change = money2(paid - total)
  const now = new Date()
  const items = cart.map((l) => ({
    invoice_no: '',
    item: l.item,
    size: l.size,
    qty: l.qty,
    price: money2(l.price),
  }))

  let counter = await nextCounter()
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNo = `LFJ-${dayStamp(now)}-${String(counter).padStart(4, '0')}`
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_no: invoiceNo,
        date_disp: dateBn(now),
        time_disp: timeBn(now),
        customer: customer.trim() || 'Walk-in Customer',
        seller,
        total,
        paid: money2(paid),
        change,
        created_at: now.toISOString(),
      })
      .select()
      .single()

    if (!error && data) {
      const rows = items.map((i) => ({ ...i, invoice_no: data.invoice_no }))
      const { data: savedItems, error: itemError } = await supabase
        .from('invoice_items')
        .insert(rows)
        .select()
      if (itemError) {
        await supabase.from('invoices').delete().eq('invoice_no', data.invoice_no)
        throw new Error('বিলের আইটেম সেভ হয়নি')
      }
      return { invoice: data as Invoice, items: (savedItems ?? []) as InvoiceItem[] }
    }

    if (error?.code === '23505') {
      counter += 1
      continue
    }
    throw new Error('বিল সেভ হয়নি: ' + (error?.message ?? 'অজানা সমস্যা'))
  }
  throw new Error('বিল নম্বর তৈরি করা যায়নি, আবার চেষ্টা করুন')
}

export async function fetchTodayInvoices(seller: string, includeAll: boolean) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .gte('created_at', startOfToday())
    .lt('created_at', startOfTomorrow())
    .order('created_at', { ascending: false })
  if (error) throw new Error('আজকের বিল লোড করা যায়নি')
  const rows = (data ?? []) as Invoice[]
  return includeAll ? rows : rows.filter((r) => r.seller === seller)
}

export async function fetchInvoice(invoiceNo: string): Promise<Sale> {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_no', invoiceNo)
    .single()
  if (error || !invoice) throw new Error('বিল পাওয়া যায়নি')

  const { data: items, error: itemError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_no', invoiceNo)
  if (itemError) throw new Error('বিলের আইটেম পাওয়া যায়নি')

  return { invoice: invoice as Invoice, items: (items ?? []) as InvoiceItem[] }
}
