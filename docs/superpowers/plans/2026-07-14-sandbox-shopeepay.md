# Sandbox ShopeePay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menampilkan ShopeePay bersama metode pembayaran lain di Snap Sandbox tanpa mengubah daftar channel Snap Production.

**Architecture:** Ekstrak konfigurasi channel Snap menjadi helper server-side murni yang mengembalikan allowlist hanya pada mode Sandbox dan callback ShopeePay jika URL order tersedia. Route checkout menggabungkan hasil helper ke payload `snap.createTransaction`, sementara Production tetap tanpa `enabled_payments` agar mengikuti Snap Preferences.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, `midtrans-client`, Node.js 24 built-in test runner.

## Global Constraints

- Perubahan hanya memengaruhi payload pembuatan Snap token.
- Sandbox memuat ShopeePay bersama GoPay, QRIS, VA bank, Mandiri Bill Payment, minimarket, dan kartu kredit.
- Production tidak mengirim `enabled_payments`.
- Server key Midtrans tidak boleh dikirim atau dicetak.
- Tidak menambah dependency test baru.
- Tidak mengubah webhook, stok, refund, shipment, atau tampilan checkout.

---

## File Structure

- Create: `lib/midtrans/snap-payment-config.ts` — constant allowlist Sandbox dan helper pembentuk parameter channel/callback.
- Create: `lib/midtrans/snap-payment-config.test.mts` — pengujian perilaku Sandbox, Production, dan callback menggunakan `node:test`.
- Modify: `app/api/checkout/create/route.ts` — memanggil helper dan menggabungkan hasilnya ke payload Snap.
- Modify: `package.json` — menambahkan script test terfokus tanpa dependency baru.
- Modify: `tsconfig.json` — mengizinkan test TypeScript mengimpor file `.ts` secara eksplisit pada mode `noEmit`.

### Task 1: Helper konfigurasi Snap Sandbox

**Files:**
- Create: `lib/midtrans/snap-payment-config.test.mts`
- Create: `lib/midtrans/snap-payment-config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: `isProduction: boolean` dan `orderUrl: string | null`.
- Produces: `getSnapPaymentConfig(isProduction, orderUrl): SnapPaymentConfig`.
- Produces: `MIDTRANS_SANDBOX_ENABLED_PAYMENTS: readonly string[]`.

- [ ] **Step 1: Tambahkan script test dan tulis failing test**

Tambahkan script berikut ke `package.json`:

```json
"test:midtrans": "node --test lib/midtrans/*.test.ts"
```

Tambahkan compiler option berikut ke `tsconfig.json`:

```json
"allowImportingTsExtensions": true
```

Buat `lib/midtrans/snap-payment-config.test.mts`:

```typescript
import assert from "node:assert/strict";
import test from "node:test";

import {
  MIDTRANS_SANDBOX_ENABLED_PAYMENTS,
  getSnapPaymentConfig,
} from "./snap-payment-config.ts";

test("Sandbox includes ShopeePay with the existing payment methods", () => {
  assert.deepEqual(MIDTRANS_SANDBOX_ENABLED_PAYMENTS, [
    "gopay",
    "shopeepay",
    "qris",
    "bca_va",
    "bni_va",
    "bri_va",
    "permata_va",
    "echannel",
    "indomaret",
    "alfamart",
    "credit_card",
  ]);

  assert.deepEqual(getSnapPaymentConfig(false, null), {
    enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS],
  });
});

test("Production remains controlled by Snap Preferences", () => {
  assert.equal(
    Object.hasOwn(getSnapPaymentConfig(true, null), "enabled_payments"),
    false,
  );
});

test("ShopeePay callback points back to the order page", () => {
  assert.deepEqual(
    getSnapPaymentConfig(false, "https://geeky.id/dashboard/orders/order-1"),
    {
      enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS],
      shopeepay: {
        callback_url: "https://geeky.id/dashboard/orders/order-1",
      },
    },
  );
});

test("Empty order URL omits the ShopeePay callback", () => {
  assert.equal(
    Object.hasOwn(getSnapPaymentConfig(false, null), "shopeepay"),
    false,
  );
});
```

- [ ] **Step 2: Jalankan test untuk memastikan RED**

Run:

```bash
npm run test:midtrans
```

Expected: FAIL dengan `ERR_MODULE_NOT_FOUND` untuk `snap-payment-config.ts`.

- [ ] **Step 3: Implementasikan helper minimal**

Buat `lib/midtrans/snap-payment-config.ts`:

```typescript
export const MIDTRANS_SANDBOX_ENABLED_PAYMENTS = [
  "gopay",
  "shopeepay",
  "qris",
  "bca_va",
  "bni_va",
  "bri_va",
  "permata_va",
  "echannel",
  "indomaret",
  "alfamart",
  "credit_card",
] as const;

type SnapPaymentConfig = {
  enabled_payments?: string[];
  shopeepay?: {
    callback_url: string;
  };
};

export function getSnapPaymentConfig(
  isProduction: boolean,
  orderUrl: string | null,
): SnapPaymentConfig {
  return {
    ...(isProduction
      ? {}
      : { enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS] }),
    ...(orderUrl
      ? {
          shopeepay: {
            callback_url: orderUrl,
          },
        }
      : {}),
  };
}
```

- [ ] **Step 4: Jalankan test untuk memastikan GREEN**

Run:

```bash
npm run test:midtrans
```

Expected: 4 tests PASS, 0 failures.

- [ ] **Step 5: Commit helper dan test**

```bash
git add package.json tsconfig.json lib/midtrans/snap-payment-config.ts lib/midtrans/snap-payment-config.test.mts
git commit -m "feat: configure ShopeePay for Snap sandbox"
```

### Task 2: Integrasikan konfigurasi ke checkout route

**Files:**
- Modify: `app/api/checkout/create/route.ts:1-20`
- Modify: `app/api/checkout/create/route.ts:337-374`

**Interfaces:**
- Consumes: `getSnapPaymentConfig(isProduction, orderUrl)` dari Task 1.
- Produces: payload Snap Sandbox dengan allowlist dan callback ShopeePay; payload Production tanpa allowlist.

- [ ] **Step 1: Tambahkan import helper**

Di bagian import `app/api/checkout/create/route.ts`, tambahkan:

```typescript
import { getSnapPaymentConfig } from "@/lib/midtrans/snap-payment-config";
```

- [ ] **Step 2: Gunakan satu nilai mode dan order URL**

Ganti pembuatan instance Snap dan `appUrl` menjadi:

```typescript
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
const snap = new Midtrans.Snap({
  isProduction,
  serverKey,
  clientKey,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
const orderUrl = appUrl
  ? `${appUrl}/dashboard/orders/${order.id}`
  : null;
```

- [ ] **Step 3: Gabungkan konfigurasi channel ke payload Snap**

Pada object `snap.createTransaction`, pertahankan `transaction_details`, `item_details`, dan `customer_details`, lalu ubah block callback menjadi:

```typescript
...getSnapPaymentConfig(isProduction, orderUrl),
...(orderUrl
  ? {
      callbacks: {
        finish: orderUrl,
      },
      gopay: {
        enable_callback: true,
        callback_url: orderUrl,
      },
    }
  : {}),
```

- [ ] **Step 4: Jalankan test dan lint terfokus**

Run:

```bash
npm run test:midtrans
npx eslint lib/midtrans/snap-payment-config.ts lib/midtrans/snap-payment-config.test.mts app/api/checkout/create/route.ts
```

Expected: 4 tests PASS dan ESLint exit 0.

- [ ] **Step 5: Jalankan verifikasi TypeScript/build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected: kedua command exit 0.

- [ ] **Step 6: Probe API Snap Sandbox**

Buat probe sementara di `C:\tmp` yang membaca `.env.local`, mengirim request dengan daftar `enabled_payments` yang sama, dan hanya mencetak HTTP status, keberadaan token, dan host redirect. Jangan cetak key atau token.

Run:

```bash
node C:\tmp\midtrans-sandbox-probe.mjs
```

Expected: HTTP 201, `snap_token_received=true`, dan host `app.sandbox.midtrans.com`. Hapus probe sementara setelah verifikasi.

- [ ] **Step 7: Commit integrasi route**

```bash
git add app/api/checkout/create/route.ts
git commit -m "feat: show ShopeePay in Snap sandbox"
```
