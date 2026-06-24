# Cancel: Midtrans & Biteship API Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an order is cancelled (by user or admin), automatically call Midtrans cancel/refund API and Biteship cancel API so the external systems stay in sync.

**Architecture:** Three new lib helpers (`cancel-transaction`, `refund-transaction`, `cancel-order`) are added. Both `cancelOrderAction` (user) and `updateOrderStatus` (admin) call these helpers after DB update. All API calls are best-effort — failure logs an error but does NOT block DB state change.

**Tech Stack:** Next.js 15 Server Actions, `fetch` (raw HTTP — no extra deps), Midtrans REST API v2, Biteship REST API v1, Supabase PostgreSQL.

---

## File Map

| Action | File |
|---|---|
| Create | `lib/midtrans/cancel-transaction.ts` |
| Create | `lib/midtrans/refund-transaction.ts` |
| Create | `lib/biteship/cancel-order.ts` |
| Modify | `app/(dashboard)/dashboard/orders/_actions.ts` |
| Modify | `app/admin/(panel)/orders/_actions.ts` |

---

## Task 1: `lib/midtrans/cancel-transaction.ts`

Calls Midtrans `/v2/{orderId}/cancel` — for `pending_payment` orders (Midtrans transaction still in `pending` state).

**Files:**
- Create: `lib/midtrans/cancel-transaction.ts`

- [ ] **Step 1: Create file**

```ts
export type MidtransCancelResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelMidtransTransaction(
  midtransOrderId: string,
): Promise<MidtransCancelResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return { ok: false, error: "MIDTRANS_SERVER_KEY tidak dikonfigurasi." };

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  const base64Key = Buffer.from(`${serverKey}:`).toString("base64");

  try {
    const res = await fetch(`${base}/v2/${encodeURIComponent(midtransOrderId)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64Key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || (json.status_code && json.status_code !== "200")) {
      const errMsg =
        (json.status_message as string) ??
        (json.error_messages as string) ??
        `Midtrans cancel error ${res.status}`;
      console.error("[Midtrans cancelTransaction] failed", {
        midtransOrderId,
        status: res.status,
        error: errMsg,
      });
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Midtrans cancelTransaction] network error", { midtransOrderId, err });
    return { ok: false, error: "Jaringan ke Midtrans gagal." };
  }
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls lib/midtrans/`
Expected: `cancel-transaction.ts` appears.

- [ ] **Step 3: Commit**

```bash
git add lib/midtrans/cancel-transaction.ts
git commit -m "feat(midtrans): add cancelMidtransTransaction helper"
```

---

## Task 2: `lib/midtrans/refund-transaction.ts`

Calls Midtrans `/v2/{orderId}/refund` — for `paid`/`processing` orders (Midtrans transaction already `settlement`). Full refund (no amount required). Updates payment record to `refunded` on success.

**Files:**
- Create: `lib/midtrans/refund-transaction.ts`

- [ ] **Step 1: Create file**

```ts
export type MidtransRefundResult =
  | { ok: true }
  | { ok: false; error: string };

export async function refundMidtransTransaction(
  midtransOrderId: string,
  reason: string,
): Promise<MidtransRefundResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return { ok: false, error: "MIDTRANS_SERVER_KEY tidak dikonfigurasi." };

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  const base64Key = Buffer.from(`${serverKey}:`).toString("base64");

  try {
    const res = await fetch(`${base}/v2/${encodeURIComponent(midtransOrderId)}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64Key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || (json.status_code && json.status_code !== "200")) {
      const errMsg =
        (json.status_message as string) ??
        (json.error_messages as string) ??
        `Midtrans refund error ${res.status}`;
      console.error("[Midtrans refundTransaction] failed", {
        midtransOrderId,
        status: res.status,
        error: errMsg,
      });
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Midtrans refundTransaction] network error", { midtransOrderId, err });
    return { ok: false, error: "Jaringan ke Midtrans gagal." };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/midtrans/refund-transaction.ts
git commit -m "feat(midtrans): add refundMidtransTransaction helper"
```

---

## Task 3: `lib/biteship/cancel-order.ts`

Calls Biteship `DELETE /v1/orders/{biteshipOrderId}` to cancel an active shipment.

**Files:**
- Create: `lib/biteship/cancel-order.ts`

- [ ] **Step 1: Create file**

```ts
export type CancelBiteshipOrderResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelBiteshipOrder(
  biteshipOrderId: string,
): Promise<CancelBiteshipOrderResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return { ok: false, error: "BITESHIP_API_KEY tidak dikonfigurasi." };

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/orders/${encodeURIComponent(biteshipOrderId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
          Accept: "application/json",
        },
      },
    );

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success === false) {
      const errMsg =
        (json.error as string) ??
        (json.message as string) ??
        `Biteship cancel error ${res.status}`;
      console.error("[Biteship cancelOrder] failed", { biteshipOrderId, status: res.status, errMsg });
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Biteship cancelOrder] network error", { biteshipOrderId, err });
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/biteship/cancel-order.ts
git commit -m "feat(biteship): add cancelBiteshipOrder helper"
```

---

## Task 4: Update `app/(dashboard)/dashboard/orders/_actions.ts`

Add Midtrans API calls to `cancelOrderAction`:
- `pending_payment` → call `cancelMidtransTransaction(order_number)`
- `paid` → call `refundMidtransTransaction(order_number, reason)` → on success, update `payments.status = 'refunded'`

Both calls are best-effort (non-fatal).

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/_actions.ts`

- [ ] **Step 1: Add imports at top of file**

Current imports (lines 1-11):
```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/supabase";

import { buildWhatsAppUrl } from "@/lib/whatsapp-link";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
```

Replace with:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/supabase";

import { buildWhatsAppUrl } from "@/lib/whatsapp-link";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
import { cancelMidtransTransaction } from "@/lib/midtrans/cancel-transaction";
import { refundMidtransTransaction } from "@/lib/midtrans/refund-transaction";
```

- [ ] **Step 2: Update `cancelOrderAction` — fetch `order_number` + `payments` record, add Midtrans calls**

The current `cancelOrderAction` fetches `select("id, status, order_number")` and updates to `cancelled`. Add Midtrans calls after the stock release logic, before `order_status_history` insert.

Find this block (lines 24-29):
```ts
    const { data: row, error: fetchErr } = await supabase
      .from("orders")
      .select("id, status, order_number")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
```

No change needed to the select — `order_number` is already fetched.

Find this block (lines 110-116) — the `order_status_history` insert:
```ts
    // Catat di status history
    await svc.from("order_status_history").insert({
      order_id: orderId,
      status: "cancelled",
      note: "Dibatalkan oleh pelanggan",
      changed_by: null,
    });
```

Replace with:
```ts
    // Midtrans: cancel/refund best-effort
    if (row.order_number) {
      if (st === "pending_payment") {
        const midtransResult = await cancelMidtransTransaction(row.order_number);
        if (!midtransResult.ok) {
          console.error("[cancelOrderAction] Midtrans cancel failed:", midtransResult.error);
        }
      } else if (st === "paid") {
        const midtransResult = await refundMidtransTransaction(
          row.order_number,
          "Dibatalkan oleh pelanggan",
        );
        if (midtransResult.ok) {
          await svc
            .from("payments")
            .update({ status: "refunded" })
            .eq("midtrans_order_id", row.order_number);
        } else {
          console.error("[cancelOrderAction] Midtrans refund failed:", midtransResult.error);
        }
      }
    }

    // Catat di status history
    await svc.from("order_status_history").insert({
      order_id: orderId,
      status: "cancelled",
      note: "Dibatalkan oleh pelanggan",
      changed_by: null,
    });
```

- [ ] **Step 3: Verify — read the modified file, confirm imports and new block are present**

The file should now import `cancelMidtransTransaction` and `refundMidtransTransaction`, and the Midtrans block should appear between stock-release logic and `order_status_history` insert.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/orders/_actions.ts
git commit -m "feat(orders): call Midtrans cancel/refund on user order cancellation"
```

---

## Task 5: Update `app/admin/(panel)/orders/_actions.ts`

Add Midtrans + Biteship API calls to `updateOrderStatus` when `newStatus === "cancelled"`:
- `pending_payment` → `cancelMidtransTransaction`
- `paid` / `processing` → `refundMidtransTransaction` → on success, update `payments.status = 'refunded'`
- `processing` / `shipped` (has `biteship_order_id`) → `cancelBiteshipOrder`

All calls best-effort (non-fatal).

**Files:**
- Modify: `app/admin/(panel)/orders/_actions.ts`

- [ ] **Step 1: Add imports**

Current imports (lines 1-8):
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { getBiteshipOrder } from "@/lib/biteship/get-order";
import { confirmBiteshipOrder } from "@/lib/biteship/confirm-order";
import { ORDER_STATUSES, type OrderStatus } from "./_constants";
import type { Database, Json } from "@/types/supabase";
```

Replace with:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { getBiteshipOrder } from "@/lib/biteship/get-order";
import { confirmBiteshipOrder } from "@/lib/biteship/confirm-order";
import { cancelBiteshipOrder } from "@/lib/biteship/cancel-order";
import { cancelMidtransTransaction } from "@/lib/midtrans/cancel-transaction";
import { refundMidtransTransaction } from "@/lib/midtrans/refund-transaction";
import { ORDER_STATUSES, type OrderStatus } from "./_constants";
import type { Database, Json } from "@/types/supabase";
```

- [ ] **Step 2: Add Midtrans + Biteship cancel block in `updateOrderStatus`**

The `updateOrderStatus` function currently has stock restoration logic for `cancelled` (lines 104-147). After the `order_status_history` insert (lines 149-158), add the following.

Find (lines 149-162):
```ts
  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      order_id: orderId,
      status: newStatus,
      note: note?.trim() || null,
      changed_by: null,
    });

  if (historyError) console.error("history log failed:", historyError.message);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
```

Replace with:
```ts
  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      order_id: orderId,
      status: newStatus,
      note: note?.trim() || null,
      changed_by: null,
    });

  if (historyError) console.error("history log failed:", historyError.message);

  // Midtrans cancel/refund on cancellation — best-effort
  if (newStatus === "cancelled" && currentOrder?.order_number) {
    const orderNum = currentOrder.order_number as string;
    if (prevStatus === "pending_payment") {
      const midtransResult = await cancelMidtransTransaction(orderNum);
      if (!midtransResult.ok) {
        console.error("[updateOrderStatus] Midtrans cancel failed:", midtransResult.error);
      }
    } else if (prevStatus === "paid" || prevStatus === "processing") {
      const midtransResult = await refundMidtransTransaction(orderNum, "Dibatalkan oleh admin");
      if (midtransResult.ok) {
        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("midtrans_order_id", orderNum);
      } else {
        console.error("[updateOrderStatus] Midtrans refund failed:", midtransResult.error);
      }
    }
  }

  // Biteship cancel on cancellation when shipment exists — best-effort
  if (newStatus === "cancelled") {
    const { data: shipment } = await supabase
      .from("shipments")
      .select("biteship_order_id, status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (
      shipment?.biteship_order_id &&
      !["delivered", "cancelled", "returned"].includes(shipment.status ?? "")
    ) {
      const biteshipResult = await cancelBiteshipOrder(shipment.biteship_order_id);
      if (biteshipResult.ok) {
        await supabase
          .from("shipments")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("order_id", orderId);
      } else {
        console.error("[updateOrderStatus] Biteship cancel failed:", biteshipResult.error);
      }
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
```

- [ ] **Step 3: Verify — confirm `currentOrder` has `order_number` in the select at line 49**

Line 49-53 currently:
```ts
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status, user_id, order_number")
    .eq("id", orderId)
    .single();
```

`order_number` is already selected. No change needed.

- [ ] **Step 4: Commit**

```bash
git add app/admin/(panel)/orders/_actions.ts
git commit -m "feat(orders): call Midtrans cancel/refund and Biteship cancel on admin cancellation"
```

---

## Self-Review

**Spec coverage:**
- [x] User cancel `pending_payment` → Midtrans cancel API called (Task 4)
- [x] User cancel `paid` → Midtrans refund API called, payment → `refunded` (Task 4)
- [x] Admin cancel `pending_payment` → Midtrans cancel API called (Task 5)
- [x] Admin cancel `paid`/`processing` → Midtrans refund API called, payment → `refunded` (Task 5)
- [x] Admin cancel with active shipment → Biteship cancel API called, shipment → `cancelled` (Task 5)
- [x] All calls best-effort (non-fatal — errors logged, not thrown) (Tasks 1-5)
- [x] `payments.status = 'refunded'` set on refund success (Tasks 4, 5)

**Placeholder scan:** No TBD/TODO. All code blocks complete.

**Type consistency:** `MidtransCancelResult`, `MidtransRefundResult`, `CancelBiteshipOrderResult` — defined in Task 1/2/3, used in Task 4/5. Consistent.

**Edge cases covered:**
- Shipment in terminal state (`delivered`, `cancelled`, `returned`) → skip Biteship cancel (Task 5)
- `order_number` null guard before Midtrans calls (Task 4, 5)
- No `biteship_order_id` → skip Biteship cancel (Task 5 — `maybeSingle()` returns null)
