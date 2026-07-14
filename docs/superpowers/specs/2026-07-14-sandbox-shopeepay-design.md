# Design: Tampilkan ShopeePay di Snap Sandbox

**Tanggal:** 2026-07-14  
**Status:** Approved

## Tujuan

Menampilkan ShopeePay di daftar pembayaran Snap Sandbox bersama metode pembayaran lain, tanpa mengubah konfigurasi atau proses aktivasi channel Midtrans Production.

## Desain

### Sandbox

Request pembuatan Snap token mengirim `enabled_payments` berisi daftar metode checkout yang sebelumnya didukung aplikasi:

- `gopay`
- `shopeepay`
- `qris`
- `bca_va`
- `bni_va`
- `bri_va`
- `permata_va`
- `echannel`
- `indomaret`
- `alfamart`
- `credit_card`

Daftar ini merupakan allowlist. Snap tetap menentukan channel mana yang benar-benar tersedia pada akun Sandbox.

### Production

Request Production tidak mengirim `enabled_payments`. Daftar pembayaran Production tetap sepenuhnya mengikuti channel yang telah aktif di Midtrans Dashboard melalui **Settings → Snap Preferences → Payment Channels**.

Dengan pemisahan ini, ShopeePay Sandbox dapat diuji tanpa mendahului atau memengaruhi proses aktivasi ShopeePay Production.

## Callback

Request tidak mengirim object callback khusus ShopeePay. Midtrans menolak object tersebut ketika channel ShopeePay belum account-enabled, meskipun `shopeepay` diterima di allowlist Sandbox. Snap menggunakan finish URL umum; callback GoPay dan finish URL yang sudah ada tetap dipertahankan.

## Struktur Kode

- Daftar pembayaran Sandbox ditempatkan pada helper/constant server-side agar tidak diduplikasi di route.
- Route checkout memilih parameter pembayaran berdasarkan nilai `MIDTRANS_IS_PRODUCTION`.
- Tidak ada key Midtrans server yang dikirim ke client.

## Pengujian

Pengujian unit mencakup:

1. Mode Sandbox menghasilkan `enabled_payments` yang memuat `shopeepay` dan metode lama lainnya.
2. Mode Production tidak menghasilkan `enabled_payments`.
3. Object callback khusus ShopeePay tidak pernah dihasilkan.

Verifikasi akhir mencakup lint, typecheck/build, dan probe Snap Sandbox. Probe tidak mencetak server key atau Snap token.

## Di Luar Scope

- Aktivasi ShopeePay Production.
- Perubahan webhook Midtrans, status order, stok, refund, atau shipment.
- Perubahan tampilan checkout selain daftar metode yang ditampilkan oleh modal Snap.
