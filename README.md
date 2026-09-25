# ShopPOS

A lightweight, offline point-of-sale web app for shops. No build step, no dependencies.

## Run

Open `index.html` in a browser, or serve it:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Features

- Product grid with search
- Cart with qty edit, stock limits, delete
- Discount, paid amount, change calculation
- Cash / Card / UPI payment
- Hold & recall bills
- Add / delete products, set shop name
- Daily + all-time sales reports, reset data
- Data persisted in `localStorage` (works offline)
