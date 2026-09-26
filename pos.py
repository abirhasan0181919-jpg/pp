import json
import os
import sys
from datetime import datetime

import tkinter as tk
from tkinter import messagebox, ttk

APP_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "ShopPOS")
DATA_FILE = os.path.join(APP_DIR, "data.json")
CURRENCY = "Tk "

DEFAULT_PRODUCTS = [
    {"id": 1, "name": "Rice 5kg", "price": 450, "stock": 20},
    {"id": 2, "name": "Sugar 1kg", "price": 45, "stock": 60},
    {"id": 3, "name": "Tea 250g", "price": 130, "stock": 30},
    {"id": 4, "name": "Coffee 100g", "price": 180, "stock": 25},
    {"id": 5, "name": "Soap", "price": 35, "stock": 80},
    {"id": 6, "name": "Shampoo", "price": 210, "stock": 15},
    {"id": 7, "name": "Cola 750ml", "price": 40, "stock": 48},
    {"id": 8, "name": "Chips", "price": 20, "stock": 100},
]


def load_data():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {
            "products": [dict(p) for p in DEFAULT_PRODUCTS],
            "sales": [],
            "held": [],
            "shop": "My Shop",
        }


def save_data(data):
    os.makedirs(APP_DIR, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)


def money(value):
    return f"{float(value or 0):.2f}"


class ShopPOS(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("ShopPOS")
        self.geometry("1100x680")
        self.minsize(900, 560)
        self.configure(bg="#0f172a")

        self.data = load_data()
        self.cart = []
        self.next_id = int(datetime.now().timestamp() * 1000)

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("TFrame", background="#0f172a")
        style.configure("Panel.TFrame", background="#1e293b")
        style.configure("TLabel", background="#0f172a", foreground="#e2e8f0")
        style.configure("Head.TLabel", background="#1e293b", foreground="#e2e8f0",
                        font=("Segoe UI", 12, "bold"))
        style.configure("Big.TLabel", background="#1e293b", foreground="#22c55e",
                        font=("Segoe UI", 20, "bold"))
        style.configure("TButton", padding=6)
        style.configure("Accent.TButton", background="#22c55e", foreground="#052e16",
                        font=("Segoe UI", 10, "bold"))
        style.configure("Treeview", background="#1e293b", fieldbackground="#1e293b",
                        foreground="#e2e8f0")
        style.configure("Treeview.Heading", background="#334155", foreground="#e2e8f0")

        self._build()
        self.refresh_all()

    def new_id(self):
        self.next_id += 1
        return self.next_id

    def _build(self):
        top = ttk.Frame(self)
        top.pack(fill="x", padx=10, pady=(10, 0))
        self.shop_var = tk.StringVar(value=self.data.get("shop", "My Shop"))
        ttk.Label(top, textvariable=self.shop_var, font=("Segoe UI", 16, "bold")).pack(side="left")
        for label, cmd in (("Products", self.open_products), ("Held bills", self.open_held),
                           ("Reports", self.open_reports)):
            ttk.Button(top, text=label, command=cmd).pack(side="right", padx=3)

        body = ttk.Frame(self)
        body.pack(fill="both", expand=True, padx=10, pady=10)
        body.columnconfigure(0, weight=3)
        body.columnconfigure(1, weight=2)
        body.rowconfigure(0, weight=1)

        # ---- left: products ----
        left = ttk.Frame(body)
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", lambda *_: self.render_products())
        search = ttk.Entry(left, textvariable=self.search_var)
        search.pack(fill="x", pady=(0, 6))
        search.focus_set()

        wrap = tk.Frame(left, bg="#0f172a")
        wrap.pack(fill="both", expand=True)
        canvas = tk.Canvas(wrap, bg="#0f172a", highlightthickness=0)
        scroll = ttk.Scrollbar(wrap, orient="vertical", command=canvas.yview)
        self.grid_frame = tk.Frame(canvas, bg="#0f172a")
        self.grid_frame.bind("<Configure>",
                             lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=self.grid_frame, anchor="nw")
        canvas.configure(yscrollcommand=scroll.set)
        canvas.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        self.canvas = canvas

        # ---- right: cart ----
        right = ttk.Frame(body, style="Panel.TFrame", padding=10)
        right.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
        right.rowconfigure(1, weight=1)

        ttk.Label(right, text="Cart", style="Head.TLabel").grid(row=0, column=0,
                                                                 columnspan=2, sticky="w")
        ttk.Button(right, text="Clear", command=self.clear_cart).grid(row=0, column=1, sticky="e")

        self.tree = ttk.Treeview(right, columns=("qty", "price", "amount"),
                                 show="headings", height=14)
        self.tree.heading("#0", text="Item")
        self.tree.heading("qty", text="Qty")
        self.tree.heading("price", text="Price")
        self.tree.heading("amount", text="Amount")
        self.tree.column("#0", width=150, anchor="w")
        for col in ("qty", "price", "amount"):
            self.tree.column(col, width=70, anchor="e")
        self.tree.bind("<Double-1>", self.edit_qty)
        self.tree.bind("<Return>", self.edit_qty)
        self.tree.grid(row=1, column=0, columnspan=2, sticky="nsew")

        row = ttk.Frame(right, style="Panel.TFrame")
        row.grid(row=2, column=0, columnspan=2, sticky="ew", pady=6)
        ttk.Label(row, text="Selected Qty", style="Head.TLabel").pack(side="left")
        self.qty_var = tk.StringVar(value="1")
        ttk.Spinbox(row, from_=1, to=999, textvariable=self.qty_var, width=6).pack(side="left", padx=6)
        ttk.Button(row, text="Set", command=self.set_selected_qty).pack(side="left")
        ttk.Button(row, text="Remove", command=self.remove_selected).pack(side="left", padx=4)

        self.sub_var = tk.StringVar(value="0.00")
        self.disc_var = tk.StringVar(value="0")
        self.total_var = tk.StringVar(value="0.00")
        self.paid_var = tk.StringVar()
        self.change_var = tk.StringVar(value="0.00")
        self.method_var = tk.StringVar(value="Cash")

        grid = ttk.Frame(right, style="Panel.TFrame")
        grid.grid(row=3, column=0, columnspan=2, sticky="ew")
        for i in (0, 1):
            grid.columnconfigure(i, weight=1)

        def field(r, label, var):
            ttk.Label(grid, text=label, style="Head.TLabel").grid(row=r, column=0,
                                                                  columnspan=2, sticky="w")
            e = ttk.Entry(grid, textvariable=var)
            e.grid(row=r + 1, column=0, columnspan=2, sticky="ew", pady=(2, 8))
            return e

        field(0, "Subtotal", self.sub_var)
        field(2, "Discount", self.disc_var)
        field(4, "Paid", self.paid_var)
        ttk.Label(grid, text="Change", style="Head.TLabel").grid(row=6, column=0, sticky="w")
        ttk.Label(grid, textvariable=self.change_var, style="Head.TLabel").grid(
            row=7, column=0, sticky="w")
        ttk.Combobox(grid, textvariable=self.method_var,
                     values=["Cash", "Card", "UPI"], state="readonly").grid(
            row=6, column=1, sticky="e")

        ttk.Label(right, text="TOTAL", style="Head.TLabel").grid(row=4, column=0,
                                                                  columnspan=2, sticky="w")
        ttk.Label(right, textvariable=self.total_var, style="Big.TLabel").grid(
            row=5, column=0, columnspan=2, sticky="w", pady=(0, 10))

        ttk.Button(right, text="Checkout", style="Accent.TButton",
                   command=self.checkout).grid(row=6, column=0, columnspan=2, sticky="ew")
        ttk.Button(right, text="Hold bill", command=self.hold_bill).grid(
            row=7, column=0, sticky="ew", pady=(6, 0))
        ttk.Button(right, text="Recall", command=self.open_held).grid(
            row=7, column=1, sticky="ew", pady=(6, 0))

        for v in (self.disc_var, self.paid_var):
            v.trace_add("write", lambda *_: self.render_totals())

    # ---------- rendering ----------
    def render_products(self):
        for w in self.grid_frame.winfo_children():
            w.destroy()
        query = self.search_var.get().strip().lower()
        for p in self.data["products"]:
            if query and query not in p["name"].lower():
                continue
            card = tk.Frame(self.grid_frame, bg="#1e293b", highlightthickness=1,
                            highlightbackground="#334155", cursor="hand2")
            card.pack(fill="x", pady=3)
            tk.Label(card, text=p["name"], bg="#1e293b", fg="#e2e8f0",
                     anchor="w", font=("Segoe UI", 10, "bold")).pack(fill="x",
                                                                     padx=8, pady=(6, 0))
            tk.Label(card, text=f"{money(p['price'])}   stock {p['stock']}", bg="#1e293b",
                     fg="#94a3b8", anchor="w").pack(fill="x", padx=8, pady=(0, 6))
            card.bind("<Button-1>", lambda e, item=p: self.add_to_cart(item))
            for child in card.winfo_children():
                child.bind("<Button-1>", lambda e, item=p: self.add_to_cart(item))

    def render_cart(self):
        for i in self.tree.get_children():
            self.tree.delete(i)
        for line in self.cart:
            self.tree.insert("", "end", iid=str(line["id"]),
                             values=(line["qty"], money(line["price"]),
                                     money(line["price"] * line["qty"])),
                             text=line["name"])
        self.render_totals()

    def render_totals(self):
        sub = self.subtotal()
        disc = min(sub, float(self.disc_var.get() or 0))
        paid = float(self.paid_var.get() or 0)
        self.sub_var.set(money(sub))
        self.total_var.set(money(sub - disc))
        self.change_var.set(money(paid - (sub - disc)))

    def refresh_all(self):
        self.render_products()
        self.render_cart()

    # ---------- cart ops ----------
    def add_to_cart(self, product):
        if product["stock"] <= 0:
            messagebox.showwarning("Out of stock", f"{product['name']} is out of stock.")
            return
        line = next((c for c in self.cart if c["id"] == product["id"]), None)
        if line:
            if line["qty"] >= product["stock"]:
                messagebox.showwarning("Stock limit", f"Only {product['stock']} in stock.")
                return
            line["qty"] += 1
        else:
            self.cart.append({"id": product["id"], "name": product["name"],
                              "price": product["price"], "qty": 1})
        self.render_cart()

    def selected_id(self):
        sel = self.tree.selection()
        return int(sel[0]) if sel else None

    def set_selected_qty(self):
        pid = self.selected_id()
        if pid is None:
            return
        qty = int(float(self.qty_var.get() or 1))
        line = next((c for c in self.cart if c["id"] == pid), None)
        product = next((p for p in self.data["products"] if p["id"] == pid), None)
        if qty <= 0:
            return self.remove_selected()
        if product and qty > product["stock"]:
            messagebox.showwarning("Stock limit", f"Only {product['stock']} in stock.")
            self.qty_var.set(str(product["stock"]))
            return
        line["qty"] = qty
        self.render_cart()

    def edit_qty(self, _event=None):
        pid = self.selected_id()
        if pid is None:
            return
        line = next((c for c in self.cart if c["id"] == pid), None)
        if line:
            self.qty_var.set(str(line["qty"]))
            self.set_selected_qty()

    def remove_selected(self):
        pid = self.selected_id()
        if pid is None:
            return
        self.cart = [c for c in self.cart if c["id"] != pid]
        self.render_cart()

    def clear_cart(self):
        if self.cart and not messagebox.askyesno("Clear cart", "Remove all items?"):
            return
        self.cart = []
        self.disc_var.set("0")
        self.paid_var.set("")
        self.render_cart()

    def subtotal(self):
        return sum(c["price"] * c["qty"] for c in self.cart)

    # ---------- sales ----------
    def checkout(self):
        if not self.cart:
            messagebox.showinfo("Cart", "Cart is empty.")
            return
        total = self.subtotal() - min(self.subtotal(), float(self.disc_var.get() or 0))
        paid = float(self.paid_var.get() or 0)
        if paid < total:
            messagebox.showwarning("Payment", "Paid amount is less than total.")
            return
        sale = {
            "id": int(datetime.now().timestamp() * 1000),
            "items": [dict(c) for c in self.cart],
            "subtotal": self.subtotal(),
            "total": total,
            "paid": paid,
            "change": paid - total,
            "method": self.method_var.get(),
            "time": datetime.now().isoformat(timespec="seconds"),
        }
        for c in self.cart:
            p = next((x for x in self.data["products"] if x["id"] == c["id"]), None)
            if p:
                p["stock"] -= c["qty"]
        self.data["sales"].append(sale)
        save_data(self.data)
        self.cart = []
        self.disc_var.set("0")
        self.paid_var.set("")
        self.refresh_all()
        if messagebox.askyesno("Sale complete",
                               f"Total: {money(total)} {CURRENCY}\n"
                               f"Change: {money(sale['change'])} {CURRENCY}\n\nPrint receipt?"):
            self.print_receipt(sale)

    def print_receipt(self, sale):
        lines = [f"{self.shop_var.get()}", "-" * 30, f"Bill #{sale['id']}", f"{sale['time']}", "-" * 30]
        for c in sale["items"]:
            lines.append(f"{c['name']} x{c['qty']}  {money(c['price'] * c['qty'])}")
        lines += ["-" * 30, f"Subtotal: {money(sale['subtotal'])}",
                  f"Discount: {money(sale['subtotal'] - sale['total'])}",
                  f"TOTAL: {money(sale['total'])} {CURRENCY}",
                  f"Paid ({sale['method']}): {money(sale['paid'])}",
                  f"Change: {money(sale['change'])}"]
        path = os.path.join(APP_DIR, "receipt.txt")
        os.makedirs(APP_DIR, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        if sys.platform.startswith("win"):
            os.startfile(path)  # noqa: S606 - opens receipt in default app

    def hold_bill(self):
        if not self.cart:
            messagebox.showinfo("Cart", "Cart is empty.")
            return
        self.data["held"].append({"at": datetime.now().isoformat(timespec="seconds"),
                                  "cart": [dict(c) for c in self.cart]})
        save_data(self.data)
        self.clear_cart()
        messagebox.showinfo("Hold", "Bill held.")

    # ---------- dialogs ----------
    def open_held(self):
        win = tk.Toplevel(self)
        win.title("Held bills")
        win.geometry("420x420")
        held = self.data["held"]
        if not held:
            tk.Label(win, text="No held bills", bg="#0f172a", fg="#e2e8f0").pack(pady=40)
            return
        for idx, entry in enumerate(held):
            amount = sum(c["price"] * c["qty"] for c in entry["cart"])
            row = tk.Frame(win, bg="#1e293b")
            row.pack(fill="x", padx=8, pady=4)
            tk.Label(row, text=f"{entry['at']}  —  {money(amount)}", bg="#1e293b",
                     fg="#e2e8f0", anchor="w").pack(side="left", padx=8, pady=8)
            ttk.Button(row, text="Recall", command=lambda i=idx, w=win: self._recall(i, w)).pack(
                side="right", padx=4)
            ttk.Button(row, text="Delete",
                       command=lambda i=idx, w=win: self._delete_held(i, w)).pack(side="right")

    def _recall(self, idx, win):
        self.cart = [dict(c) for c in self.data["held"][idx]["cart"]]
        self.data["held"].pop(idx)
        save_data(self.data)
        win.destroy()
        self.render_cart()

    def _delete_held(self, idx, win):
        self.data["held"].pop(idx)
        save_data(self.data)
        win.destroy()
        self.open_held()

    def open_products(self):
        win = tk.Toplevel(self)
        win.title("Products")
        win.geometry("620x480")
        win.configure(bg="#0f172a")
        refs = {"listbox": None}

        tk.Label(win, text="Shop name", bg="#0f172a", fg="#e2e8f0").grid(
            row=0, column=0, columnspan=3, sticky="w", pady=(8, 2))
        shop_entry = ttk.Entry(win, textvariable=self.shop_var)
        shop_entry.grid(row=1, column=0, columnspan=3, sticky="ew", padx=8)
        ttk.Button(win, text="Save shop name", command=self.save_shop).grid(
            row=2, column=0, columnspan=3, sticky="w", padx=8, pady=4)

        ttk.Separator(win).grid(row=3, column=0, columnspan=3, sticky="ew", pady=8)

        name = tk.StringVar()
        price = tk.StringVar()
        stock = tk.StringVar()
        for col, (label, var) in enumerate((("Name", name), ("Price", price), ("Stock", stock))):
            tk.Label(win, text=label, bg="#0f172a", fg="#e2e8f0").grid(
                row=4, column=col, sticky="w", padx=8, pady=(0, 2))
            ttk.Entry(win, textvariable=var, width=18).grid(row=5, column=col, sticky="ew", padx=8)
            win.columnconfigure(col, weight=1)
        ttk.Button(win, text="Add product",
                   command=lambda: self.add_product(refs, name, price, stock)).grid(
            row=6, column=0, columnspan=3, sticky="ew", padx=8, pady=8)

        listbox = tk.Listbox(win, bg="#1e293b", fg="#e2e8f0", height=12)
        listbox.grid(row=7, column=0, columnspan=3, sticky="nsew", padx=8)
        win.rowconfigure(7, weight=1)
        refs["listbox"] = listbox
        self.fill_product_list(listbox)

    def fill_product_list(self, listbox):
        listbox.delete(0, "end")
        for p in self.data["products"]:
            listbox.insert("end", f"{p['name']}   {money(p['price'])}   stock {p['stock']}")
        listbox.bind("<Double-1>",
                     lambda e: self.delete_selected_product(listbox))

    def add_product(self, refs, name, price, stock):
        if not name.get().strip() or not price.get().strip():
            messagebox.showwarning("Add product", "Name and price are required.")
            return
        self.data["products"].append({
            "id": self.new_id(),
            "name": name.get().strip(),
            "price": float(price.get() or 0),
            "stock": int(float(stock.get() or 0)),
        })
        save_data(self.data)
        self.render_products()
        self.fill_product_list(refs["listbox"])
        name.set("")
        price.set("")
        stock.set("")

    def delete_selected_product(self, listbox):
        sel = listbox.curselection()
        if not sel:
            return
        pid = self.data["products"][sel[0]]["id"]
        if not messagebox.askyesno("Delete product", "Delete this product?"):
            return
        self.data["products"] = [p for p in self.data["products"] if p["id"] != pid]
        self.cart = [c for c in self.cart if c["id"] != pid]
        save_data(self.data)
        self.refresh_all()
        self.fill_product_list(listbox)

    def save_shop(self):
        self.data["shop"] = self.shop_var.get().strip() or "My Shop"
        save_data(self.data)

    def open_reports(self):
        win = tk.Toplevel(self)
        win.title("Reports")
        win.geometry("720x480")
        win.configure(bg="#0f172a")
        sales = self.data["sales"]
        today = datetime.now().date()
        day = [s for s in sales if datetime.fromisoformat(s["time"]).date() == today]
        net = sum(s["total"] for s in day)
        allnet = sum(s["total"] for s in sales)
        tk.Label(win, text=f"Today: {len(day)} sales   total {money(net)} {CURRENCY}",
                 bg="#0f172a", fg="#22c55e", font=("Segoe UI", 12, "bold")).pack(anchor="w", padx=10, pady=6)
        tk.Label(win, text=f"All time: {len(sales)} sales   total {money(allnet)} {CURRENCY}",
                 bg="#0f172a", fg="#e2e8f0", font=("Segoe UI", 10)).pack(anchor="w", padx=10)

        cols = ("time", "items", "subtotal", "total", "method")
        tree = ttk.Treeview(win, columns=cols, show="headings", height=15)
        for col, label, width in (("time", "Time", 150), ("items", "Items", 60),
                                  ("subtotal", "Subtotal", 90), ("total", "Total", 90),
                                  ("method", "Pay", 80)):
            tree.heading(col, text=label)
            tree.column(col, width=width, anchor="e" if col != "time" else "w")
        tree.pack(fill="both", expand=True, padx=10, pady=10)
        for s in reversed(sales[-200:]):
            tree.insert("", "end", values=(s["time"], len(s["items"]),
                                           money(s["subtotal"]), money(s["total"]), s["method"]))
        ttk.Button(win, text="Reset all data", command=self.reset_data).pack(pady=(0, 10))

    def reset_data(self):
        if not messagebox.askyesno("Reset", "Delete all products, sales and held bills?"):
            return
        self.data = {"products": [dict(p) for p in DEFAULT_PRODUCTS], "sales": [],
                     "held": [], "shop": "My Shop"}
        self.cart = []
        self.shop_var.set("My Shop")
        save_data(self.data)
        self.refresh_all()


if __name__ == "__main__":
    ShopPOS().mainloop()
