# Variabel lingkungan untuk Vercel

Tambahkan di **Project → Settings → Environment Variables**. Setidaknya untuk **Production** dan **Preview** (branch `development`).

Gunakan nilai yang sama dengan `.env.local` Anda (tanpa commit secret ke Git).

| Name | Production / Preview | Catatan |
|------|----------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya | Key `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya | Hanya server; jangan expose ke client |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Ya | |
| `MIDTRANS_SERVER_KEY` | Ya | Server only |
| `MIDTRANS_IS_PRODUCTION` | Ya | `false` sandbox / `true` live |
| `BITESHIP_API_KEY` | Ya | Server only |
| `BITESHIP_IS_PRODUCTION` | Ya | |
| `RESEND_API_KEY` | Ya | Server only |
| `RESEND_FROM_EMAIL` | Ya | |
| `RESEND_FROM_NAME` | Ya | Opsional |
| `RESEND_ADMIN_EMAIL` | Ya | |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Ya | Bila GA4 sudah aktif |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Ya | |
| `TURNSTILE_SECRET_KEY` | Ya | Server only |
| `NEXT_PUBLIC_APP_URL` | Ya | URL deployment (production vs preview berbeda) |
| `NEXTAUTH_SECRET` | Ya | String acak panjang |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Ya | |

Setelah mengubah env, **redeploy** agar build/runtime memakai nilai baru.
