const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
]

const pad = (n: number) => String(n).padStart(2, '0')

/** Latin digits -> Bangla digits. */
export function toBnDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)])
}

export function money(value: number | null | undefined): string {
  return Number(value ?? 0).toFixed(2)
}

/** e.g. ২৬ সেপ্টেম্বর ২০২৬ */
export function dateBn(d: Date = new Date()): string {
  return `${toBnDigits(d.getDate())} ${MONTHS[d.getMonth()]} ${toBnDigits(d.getFullYear())}`
}

/** e.g. ০৩:২৫ পূর্বাহ্ণ */
export function timeBn(d: Date = new Date()): string {
  const h24 = d.getHours()
  const suffix = h24 < 12 ? 'পূর্বাহ্ণ' : 'বিকাল'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${toBnDigits(pad(h12))}:${toBnDigits(pad(d.getMinutes()))} ${suffix}`
}

/** 58mm receipt footer helper */
export const SHOP_NAME = 'Live Fruit Juice'
export const SHOP_TAGLINE = 'তাজা ফলের রস — সেরা স্বাদ, সেরা দাম'
