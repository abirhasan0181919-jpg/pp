# Live Fruit Juice — স্টাফ বিলিং অ্যাপ

জুস শপের জন্য মোবাইল-ফ্রেন্ডলি বিলিং (POS) ওয়েব অ্যাপ। ব্যাকএন্ড: **Supabase**। সব ইন্টারফেস বাংলায়।

## সেটআপ

```sh
npm install
cp .env.example .env
```

`.env`-এ নিজের Supabase প্রজেক্টের তথ্য দিন:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_PASSWORD_SALT=livefruitjuice_salt_
```

`VITE_PASSWORD_SALT` অবশ্যই ডেস্কটপ অ্যাপের salt-এর সাথে মিলতে হবে (ডিফল্ট `livefruitjuice_salt_`)।

চালানো:

```sh
npm run dev      # ডেভ সার্ভার (ফোন/ট্যাবলেট থেকে একই WiFi-তে খোলা যায়)
npm run build    # প্রোডাকশন বিল্ড -> dist/
npm run preview  # বিল্ড প্রিভিউ
```

## স্ক্রিন

1. **লগইন** — ইউজারনেম + পাসওয়ার্ড। Supabase Auth ব্যবহার হয় না; অ্যাপ নিজে
   `SHA256("livefruitjuice_salt_" + password)` হিসাব করে `employees.password_hash`-এর সাথে মেলায়।
   সফল হলে `username` ও `role` ব্রাউজার স্টোরেজে সেভ হয় (সেশন)।
2. **বিলিং** — `products` টেবিল থেকে পণ্য, প্রতিটির S/M/L সাইজ বাটন ও দাম।
   পণ্য + সাইজ বাছাই করে পরিমাণ দিয়ে **কার্টে যোগ করো**। কার্ট, সর্বমোট, কাস্টমারের নাম,
   দেওয়া টাকা, ফেরত/বাকি (সবুজ/লাল) লাইভ দেখায়। **বিল সম্পন্ন করো ও প্রিন্ট করো** চাপলে
   `invoices` + `invoice_items`-এ রেকর্ড হয় এবং প্রিন্ট ভিউ খোলে।
3. **প্রিন্ট রিসিট** — ব্রাউজারের নেটিভ প্রিন্ট (`window.print()`), 58mm রিসিট
   (`@page { size: 58mm auto; margin: 0; }`)। খোলার সময়ই অটো প্রিন্ট হয়।
4. **আজকের বিলসমূহ** — আজকের ইনভয়েস (সেলার + `created_at` ফিল্টার করে)।
   প্রতিটির পাশে **প্রিন্ট** বাটন দিয়ে রি-প্রিন্ট। মালিক (`role = 'owner'`) চাইলে
   "সব স্টাফের বিল দেখুন" টগলে সবার বিল দেখতে পারবেন; স্টাফ শুধু নিজের বিল দেখে।

## পণ্য রিয়েলটাইম

বিলিং স্ক্রিনে Supabase Realtime (`postgres_changes` on `products`) সাবস্ক্রাইব করা আছে,
তাই ডেস্কটপ অ্যাপে পণ্য যোগ/বদল/ডিলিট করলে এই স্ক্রিন সাথে সাথে আপডেট হয় — পেজ রিফ্রেশ লাগে না।
পেজ খোলার সময়ও পণ্য তালিকা রিফ্রেশ হয়।

## ডেটাবেস

এই টেবিলগুলো ব্যবহার করা হয়, কাঠামো পরিবর্তন করা হয় না:

```sql
employees (id uuid, username text unique, password_hash text, role text, created_at timestamptz)
products (id uuid, name text, price_s numeric, price_m numeric, price_l numeric, updated_at timestamptz)
invoices (invoice_no text primary key, date_disp text, time_disp text, customer text,
           seller text, total numeric, paid numeric, change numeric, created_at timestamptz)
invoice_items (id uuid, invoice_no text references invoices, item text, size text,
               qty numeric, price numeric)
```

### Supabase-এ যা চালাতে হবে

- **Realtime** চালু করুন: `products` টেবিল realtime publication-এ যোগ করুন
  (SQL Editor: `alter publication supabase_realtime add table products;`)
- **RLS policy** (অ্যাপ anon key দিয়ে ঢুকবে, তাই policy দিতে হবে) — নিচের মতো যোগ করুন:

```sql
alter table products enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table employees enable row level security;

-- অ্যাপ read-only products পড়তে পারে, desktop app (service role) লিখবে
create policy "anon read products" on products for select using (true);

-- employees: লগইনের জন্য username দিয়ে read (পাসওয়ার্ড hash app-এই যাচাই হয়)
create policy "anon read employees" on employees for select using (true);

-- বিল ইনসার্ট
create policy "anon insert invoices" on invoices for insert with check (true);
create policy "anon insert invoice_items" on invoice_items for insert with check (true);

-- আজকের বিলসমূহ পড়া
create policy "anon read invoices" on invoices for select using (true);
create policy "anon read invoice_items" on invoice_items for select using (true);
```

> নিরাপত্তা নোট: উপরের policy গুলো ক্লায়েন্ট-সাইড ফিল্টারিং-এর জন্য যথেষ্ট (ইনভয়েস সেলার দিয়ে
> ফিল্টার করা হয় অ্যাপে)। কড়াকড়ি সুরক্ষা চাইলে অ্যাপের পরিবর্তে একটি Supabase Edge Function
> ব্যবহার করে ইনভয়েস ইনসার্ট/রিড করানো উচিত — তখন RLS একদম বন্ধ রাখা যাবে।

## বিল নম্বর ও `change`

- ইনভয়েস নম্বর: `LFJ-<YYMMDD>-<0001>` (দিনভিত্তিক ধারাবাহিক সংখ্যা)।
  একই নম্বর হলে (unique violation) অটো বাড়িয়ে আবার চেষ্টা করে।
- `change = paid - total`। ধন্যবাদকরী হলে রশিদে "ফেরত", ঋণাত্মক হলে "বাকি" দেখায়।

## ফাইল কাঠামো

```
src/
  App.tsx              অ্যাপ শেল + স্ক্রিন সুইচ
  main.tsx             এন্ট্রি পয়েন্ট
  index.css            স্টাইল + 58mm প্রিন্ট CSS
  lib/supabase.ts      Supabase ক্লায়েন্ট
  lib/session.ts       SHA256 লগইন ও সেশন
  lib/invoice.ts       বিল সেভ/ফেচ, ইনভয়েস নম্বর
  lib/bn.ts            বাংলা তারিখ/সময়/ডিজিট
  lib/types.ts         টাইপ
  components/          Login, Billing, Receipt, TodayBills
```
