● Langkah-langkahnya:

  ---
  1. Tambah domain di Vercel

  Vercel dashboard → project GeekyTech → Settings → Domains → ketik   geeeky.id → Add → lakukan hal yang sama untuk www.geeeky.id     

  Vercel akan tampilkan dua DNS record yang harus diarahkan.       

  ---
  2. Arahkan DNS di registrar domain

  Masuk ke tempat kamu beli domain (Niagahoster, Namecheap,        
  Cloudflare, dll) → DNS settings → tambahkan:

  ┌───────┬──────┬──────────────────────┐
  │ Type  │ Name │        Value         │
  ├───────┼──────┼──────────────────────┤
  │ A     │ @    │ 76.76.21.21          │
  ├───────┼──────┼──────────────────────┤
  │ CNAME │ www  │ cname.vercel-dns.com │
  └───────┴──────┴──────────────────────┘

  ▎ Nilai exaknya ikut yang ditampilkan Vercel, bukan hardcode di  
  ▎ atas — Vercel kadang minta record berbeda tergantung
  ▎ konfigurasi.

  ---
  3. Set branch assignment di Vercel

  Di Settings → Domains, setelah domain verified:
  - geeeky.id → assign ke branch main (production)
  - Tambah subdomain dev.geeeky.id → assign ke branch development  
  (preview)

  Untuk dev.geeeky.id, tambah CNAME di registrar:

  ┌───────┬──────┬──────────────────────┐
  │ Type  │ Name │        Value         │
  ├───────┼──────┼──────────────────────┤
  │ CNAME │ dev  │ cname.vercel-dns.com │
  └───────┴──────┴──────────────────────┘

  ---
  4. Update env vars

  Di Vercel → Settings → Environment Variables, update:
  NEXT_PUBLIC_APP_URL=https://geeeky.id

  Lalu webhook Biteship bisa diisi:
  https://geeeky.id/api/webhooks/biteship

  Dan webhook Midtrans (di dashboard Midtrans → Settings → Payment 
  → Notification URL):
  https://geeeky.id/api/webhooks/midtrans

  ---
  DNS propagasi biasanya 5–30 menit, paling lama 24 jam. Vercel    
  otomatis issue SSL certificate setelah domain verified.