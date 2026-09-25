const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Rice 5kg', price: 450, stock: 20 },
  { id: 2, name: 'Sugar 1kg', price: 45, stock: 60 },
  { id: 3, name: 'Tea 250g', price: 130, stock: 30 },
  { id: 4, name: 'Coffee 100g', price: 180, stock: 25 },
  { id: 5, name: 'Soap', price: 35, stock: 80 },
  { id: 6, name: 'Shampoo', price: 210, stock: 15 },
  { id: 7, name: 'Cola 750ml', price: 40, stock: 48 },
  { id: 8, name: 'Chips', price: 20, stock: 100 }
];

let products = store.get('products', DEFAULT_PRODUCTS);
let cart = store.get('cart', []);
let held = store.get('held', []);
let sales = store.get('sales', []);
let shopName = store.get('shopName', 'My Shop');

const money = (n) => Number(n || 0).toFixed(2);
const cartTotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
const subtotal = () => cartTotal();
const total = () => Math.max(0, subtotal() - discount());
const discount = () => Math.min(subtotal(), Number($('#discount').value) || 0);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 1800);
}

function renderProducts() {
  const q = $('#search').value.trim().toLowerCase();
  const grid = $('#productGrid');
  grid.innerHTML = '';
  products
    .filter(p => p.name.toLowerCase().includes(q))
    .forEach(p => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<b></b><span></span>`;
      el.querySelector('b').textContent = p.name;
      el.querySelector('span').textContent = `${money(p.price)} · stock ${p.stock}`;
      el.onclick = () => addToCart(p);
      grid.appendChild(el);
    });
}

function addToCart(p) {
  if (p.stock <= 0) return toast(`${p.name} out of stock`);
  const line = cart.find(i => i.id === p.id);
  if (line) {
    if (line.qty >= p.stock) return toast(`Only ${p.stock} in stock`);
    line.qty++;
  } else {
    cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
  }
  render();
}

function setQty(id, qty) {
  const line = cart.find(i => i.id === id);
  if (!line) return;
  const p = products.find(x => x.id === id);
  const max = p ? p.stock : 999;
  if (qty > max) return toast(`Only ${max} in stock`);
  if (qty <= 0) return removeLine(id);
  line.qty = qty;
  render();
}

function removeLine(id) {
  cart = cart.filter(i => i.id !== id);
  render();
}

function renderCart() {
  const box = $('#cartItems');
  box.innerHTML = '';
  cart.forEach(i => {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `<div><div class="n"></div><div class="s"></div></div>
      <input type="number" min="1" step="1"><button class="ghost small">X</button>`;
    row.querySelector('.n').textContent = i.name;
    row.querySelector('.s').textContent = money(i.price * i.qty);
    const inp = row.querySelector('input');
    inp.value = i.qty;
    inp.onchange = () => setQty(i.id, parseInt(inp.value, 10) || 1);
    row.querySelector('button').onclick = () => removeLine(i.id);
    box.appendChild(row);
  });
  $('#subtotal').textContent = money(subtotal());
  $('#total').textContent = money(total());
  const paid = Number($('#paid').value) || 0;
  $('#change').textContent = money(paid - total());
}

function render() {
  renderProducts();
  renderCart();
  store.set('cart', cart);
  $('#btnHeld').textContent = `Held (${held.length})`;
  $('#shopName').textContent = shopName;
}

function checkout() {
  if (!cart.length) return toast('Cart is empty');
  const t = total();
  const paid = Number($('#paid').value) || 0;
  if (paid < t) return toast('Paid amount is less than total');
  const sale = {
    id: Date.now(),
    items: cart.map(i => ({ ...i })),
    subtotal: subtotal(),
    discount: subtotal() - t,
    total: t,
    paid,
    change: paid - t,
    method: $('#payMethod').value
  };
  cart.forEach(i => {
    const p = products.find(x => x.id === i.id);
    if (p) p.stock -= i.qty;
  });
  sales.push(sale);
  store.set('products', products);
  store.set('sales', sales);
  cart = [];
  $('#discount').value = 0;
  $('#paid').value = 0;
  render();
  toast(`Sale done — change ${money(sale.change)}`);
}

function openModal(title, bodyHTML) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modal').classList.remove('hidden');
}

function productManager() {
  openModal('Products', `
    <form id="pForm" style="display:grid;grid-template-columns:1fr 90px 80px auto;gap:6px;margin-bottom:10px">
      <input id="pName" placeholder="Name" required>
      <input id="pPrice" type="number" step="0.01" min="0" placeholder="Price" required>
      <input id="pStock" type="number" step="1" min="0" placeholder="Stock" required>
      <button class="primary" type="submit">Add</button>
    </form>
    <table><thead><tr><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody id="pRows"></tbody></table>
    <div style="margin-top:12px"><label>Shop name <input id="sName" value="${shopName.replace(/"/g, '&quot;')}"></label>
      <button id="btnSaveShop" class="ghost">Save</button></div>`);
  const rows = $('#pRows');
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td></td><td></td><td></td><td><button class="ghost small">Del</button></td>';
    tr.children[0].textContent = p.name;
    tr.children[1].textContent = money(p.price);
    tr.children[2].textContent = p.stock;
    tr.querySelector('button').onclick = () => {
      products = products.filter(x => x.id !== p.id);
      store.set('products', products);
      productManager();
      render();
    };
    rows.appendChild(tr);
  });
  $('#pForm').onsubmit = (e) => {
    e.preventDefault();
    products.push({
      id: Date.now(),
      name: $('#pName').value.trim(),
      price: Number($('#pPrice').value),
      stock: Number($('#pStock').value)
    });
    store.set('products', products);
    productManager();
    render();
  };
  $('#btnSaveShop').onclick = () => {
    shopName = $('#sName').value.trim() || 'My Shop';
    store.set('shopName', shopName);
    render();
    toast('Shop name saved');
  };
}

function reports() {
  const day = sales.filter(s => new Date(s.id).toDateString() === new Date().toDateString());
  const gross = day.reduce((s, x) => s + x.subtotal, 0);
  const disc = day.reduce((s, x) => s + x.discount, 0);
  const net = day.reduce((s, x) => s + x.total, 0);
  const rows = sales.slice(-25).reverse().map(s => `
    <tr><td>${new Date(s.id).toLocaleString()}</td><td>${s.items.length}</td>
    <td>${money(s.subtotal)}</td><td>${money(s.total)}</td><td>${s.method}</td></tr>`).join('');
  openModal('Reports', `
    <p>Today: <b>${day.length}</b> sales · gross <b>${money(gross)}</b> · discount <b>${money(disc)}</b> · net <b>${money(net)}</b></p>
    <p>All time sales: <b>${sales.length}</b> · total <b>${money(sales.reduce((s, x) => s + x.total, 0))}</b></p>
    <table><thead><tr><th>Time</th><th>Items</th><th>Sub</th><th>Total</th><th>Pay</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No sales yet</td></tr>'}</tbody></table>
    <button id="btnReset" class="ghost" style="margin-top:10px">Reset all data</button>`);
  $('#btnReset').onclick = () => {
    if (!confirm('Delete all products, sales and held bills?')) return;
    localStorage.clear();
    location.reload();
  };
}

$('#search').oninput = renderProducts;
$('#discount').oninput = renderCart;
$('#paid').oninput = renderCart;
$('#btnCheckout').onclick = checkout;
$('#btnClear').onclick = () => { cart = []; render(); };
$('#btnProducts').onclick = productManager;
$('#btnReports').onclick = reports;
$('#btnCloseModal').onclick = () => $('#modal').classList.add('hidden');
$('#btnHold').onclick = () => {
  if (!cart.length) return toast('Cart is empty');
  held.push({ cart, at: Date.now() });
  store.set('held', held);
  cart = [];
  render();
  toast('Bill held');
};
$('#btnHeld').onclick = () => {
  if (!held.length) return toast('No held bills');
  openModal('Held bills', held.map((h, i) => `
    <div class="row"><span>${new Date(h.at).toLocaleString()} — ${money(h.cart.reduce((s, x) => s + x.price * x.qty, 0))}</span>
    <span><button class="ghost small" data-i="${i}">Recall</button>
    <button class="ghost small" data-d="${i}">Del</button></span></div>`).join(''));
  $('#modalBody').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
    cart = held[b.dataset.i].cart;
    store.set('cart', cart);
    $('#modal').classList.add('hidden');
    render();
  });
  $('#modalBody').querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    held.splice(Number(b.dataset.d), 1);
    store.set('held', held);
    reports();
    render();
  });
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('#modal').classList.add('hidden');
});

render();
