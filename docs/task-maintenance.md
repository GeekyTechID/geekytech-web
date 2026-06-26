# DASHBOARD ADMIN

1. Cek pembatalan transaksi dan refund pakai gopay

2. Welcome email user baru (Google OAuth)
   - Kode sudah ada di `lib/email/send-welcome.ts` + `lib/email/templates/welcome.ts`
   - Dikirim otomatis di `app/auth/callback/route.ts` untuk user baru (created < 60 detik)
   - **Perlu**: set `RESEND_API_KEY` dan `RESEND_FROM_EMAIL` di `.env.production` (VPS) dan Vercel env vars (development/production)
   - **Perlu**: verifikasi domain `geeky.id` di Resend Dashboard → Domains agar email tidak masuk spam
   - **Perlu**: tambah `noreply@geeky.id` (atau subdomain `mail.geeky.id`) sebagai verified sender di Resend

3. Setup Resend (belum ada konfigurasi sama sekali)
   - Daftar / login ke [resend.com](https://resend.com)
   - Tambah dan verifikasi domain `geeky.id` (tambah DNS record TXT/MX di GoDaddy cPanel)
   - Buat API key → salin ke env var `RESEND_API_KEY` di VPS `.env.production` dan Vercel
   - Set `RESEND_FROM_EMAIL=noreply@geeky.id`
   - Test kirim email dari Resend Dashboard sebelum deploy ke production

----------------------------------------------------------
----------------------------------------------------------
----------------------------------------------------------


# Task Maintenance — VPS Production (geeky.id)

Checklist hidup untuk kerjaan lanjutan terkait hosting VPS. Update tanggal & coret kalau sudah selesai. Detail historis ada di `docs/report/`.

## Payment & shipping keys

- [ ] Ganti Midtrans Sandbox → Production key di `.env.production` (VPS) setelah akun bisnis Midtrans approved. **Wajib rebuild** (bukan cuma restart) karena `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` di-inject saat build — push ke `main` lewat alur normal supaya GitHub Actions handle build+restart otomatis.
- [ ] Ganti Biteship Sandbox → Production key setelah akun upgrade ke live.
- [ ] Set `MIDTRANS_IS_PRODUCTION=true` dan `BITESHIP_IS_PRODUCTION=true` bersamaan dengan ganti key di atas.
- [ ] Daftarkan webhook URL ke dashboard masing-masing (kalau belum):
  - Midtrans: `https://geeky.id/api/webhooks/midtrans`
  - Biteship: `https://geeky.id/?token=<BITESHIP_WEBHOOK_SECRET>`

## Cron jobs (cron-job.org)

- [ ] Setup cron `/api/cron/expire-orders` (tiap 5-10 menit), header `Authorization: Bearer <CRON_SECRET>` (value ada di `.env.production` VPS dan `docs/vps-access/README.md`)
- [ ] Setup cron `/api/ping` (tiap 5 hari) — anti-pause Supabase free tier, sesuai CLAUDE.md

## Cleanup

- [ ] Hapus domain `geeky.id` (& `www.geeky.id`) dari project Vercel — Settings → Domains. Tidak urgent, cuma menghilangkan warning "misconfigured" + hemat build minutes (Vercel masih auto-build tiap push ke `main` walau traffic sudah 100% ke VPS)
- [ ] Investigasi warning Apache `unable to start piped log program ... --main=146-255-39-43.cprapid.com` yang muncul tiap restart httpd — referensi hostname/IP lama dari template server, non-blocking tapi belum ketahuan sumbernya

## Belum dibahas sama sekali

- [ ] **Backup strategy VPS** — database aman di Supabase (terpisah), tapi belum ada rencana backup untuk: konfigurasi server (Apache userdata, systemd unit, sudoers, firewalld rules), `.env.production`. Kalau VPS kena masalah, semua ini harus disetup ulang dari nol kecuali didokumentasikan/dibackup.
- [ ] Monitoring/alerting kalau `geekytech-web.service` crash atau VPS down (saat ini cuma `Restart=always` di systemd, tidak ada notifikasi ke admin)
- [ ] CSF firewall — kalau suatu saat mau dicoba lagi, cek dulu `nslookup download.configserver.com 8.8.8.8` sudah resolve atau belum sebelum migrasi dari `firewalld`

## Kode (bukan infra, tapi ketemu saat migrasi)

- [ ] `GOJEK_GOSEN_LANG` (typo, hilang huruf D) dipakai di satu tempat kode, sementara env yang ada `GOJEK_GOSEND_LANG` — kemungkinan bug lama, perlu dicek/fix di kode
- [ ] `BITESHIP_ORIGIN_POSTAL` vs `BITESHIP_ORIGIN_POSTAL_CODE` — dua nama berbeda dipakai di file berbeda untuk hal yang sama. Saat ini di-workaround dengan isi keduanya di env, tapi idealnya kode disatukan ke satu nama saja
