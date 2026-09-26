export type Size = 'S' | 'M' | 'L'

export interface Employee {
  id: string
  username: string
  password_hash: string
  role: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  price_s: number | null
  price_m: number | null
  price_l: number | null
  updated_at: string
}

export interface Invoice {
  invoice_no: string
  date_disp: string
  time_disp: string
  customer: string
  seller: string
  total: number
  paid: number
  change: number
  created_at: string
}

export interface InvoiceItem {
  id: string
  invoice_no: string
  item: string
  size: string
  qty: number
  price: number
}

export interface CartLine {
  key: string
  productId: string
  item: string
  size: Size
  qty: number
  price: number
}

export interface Session {
  username: string
  role: string
}
