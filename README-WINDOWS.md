# ShopPOS — Windows Desktop App

Windows-এর জন্য POS (Point of Sale) অ্যাপ। Python + Tkinter — কোনো এক্সট্রা লাইব্রেরি লাগে না।

## ১. Python ইনস্টল

<https://www.python.org/downloads/> থেকে ডাউনলোড করে ইনস্টল করুন।

ইনস্টলের সময় **"Add python.exe to PATH"** টিক দেবেন।

যাচাই করতে Command Prompt-এ:

```sh
py -3 --version
```

## ২. অ্যাপ চালানো

`pos.py` আর `run.bat` একই ফোল্ডারে রাখুন, তারপর `run.bat`-এ ডাবল ক্লিক করুন।

অথবা:

```sh
py -3 pos.py
```

## ৩. EXE বানানো (একবারই)

`build_exe.bat` ডাবল ক্লিক করুন। ইন্টারনেট লাগবে (PyInstaller ডাউনলোডের জন্য)।

বানানো হলে `dist\ShopPOS.exe` পাবেন — এই একটি ফাইল যেকোনো Windows কম্পিউটারে কপি করে চালানো যাবে, Python লাগবে না।

## ফিচার

- প্রোডাক্ট গ্রিড + সার্চ
- কার্ট: quantity বদলানো (সিলেক্ট করে Set, অথবা ডাবল-ক্লিক), মুছে ফেলা
- স্টক সীমা — বেশি quantity দিলে আটকে দেয়
- Discount, paid, change হিসাব
- Cash / Card / UPI
- বিল hold ও recall
- রিসিট ফাইল তৈরি (Notepad-এ খোলে, ছাপা নেওয়া যায়)
- Product add/delete, দোকানের নাম সেভ
- দৈনিক ও সর্বমোট সেলস রিপোর্ট, সব ডেটা রিসেট

## ডেটা কোথায় থাকে

```
%APPDATA%\ShopPOS\data.json
```

অর্থাৎ `C:\Users\<আপনার নাম>\AppData\Roaming\ShopPOS\data.json` — ব্যাকআপ নিতে চাইলে এই ফাইলটা কপি করে রাখুন।

## ওয়েব ভার্সন

`ShopPOS.html` ফাইলটা ব্রাউজারে খুললেও চলবে (ইন্টারনেট লাগে না) — দোকানের দ্বিতীয় কম্পিউটার বা ট্যাবলেটে কাজে লাগবে।
