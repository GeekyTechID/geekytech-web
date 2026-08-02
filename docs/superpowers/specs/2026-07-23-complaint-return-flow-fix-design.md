# Komplain & Retur — Flow Fix + Completion

**Date:** 2026-07-23
**Status:** Approved (pending final spec review)
**References:** `2026-06-24-complaint-return-design.md` (original spec — this addendum fixes a gap found while wiring it up, doesn't change its architecture)

---

## Root Cause

`submitComplaintAction` always inserts `complaints.type = "product"`. Nothing anywhere — including `approveReturn` — ever sets `type = "return"`. `complaint-detail.tsx` only renders `<ReturnManager>` (which holds the "Setujui Retur" button, and everything downstream: ship-back form, admin receive-confirm, replacement shipment) when `complaint.type === "return"`. Since that condition is never true, the entire return flow built per the original spec has never been reachable in production.

---

## Fix

### 1. Buyer intent at complaint submission (`OrderComplaintForm`)

Add a required choice, e.g. radio/select:
- **"Tukar / kembalikan barang"** → `type: "return"`
- **"Lainnya (tanpa tukar barang)"** → `type: "product"`

`submitComplaintAction` stores whichever the buyer picks instead of hardcoding `"product"`.

Refund/uang kembali is **not** an option here — that's the existing cancel-order flow (per original spec's Out of Scope) and stays untouched.

### 2. Admin review (`complaint-detail.tsx` Actions panel)

- Un-gate `<ReturnManager>`: render whenever `complaint.status === "in_review"`, regardless of `type`.
- Show the buyer's `type` as a read-only hint near the top: "Permintaan pembeli: Tukar barang" / "Permintaan pembeli: Lainnya".
- Admin's three actions (**Tandai Selesai** / **Tolak Komplain** / **Setujui Retur**) are always all available during `in_review` — admin picks based on the chat discussion, independent of the buyer's initial pick. `approveReturn` behavior is unchanged.

### 3. Proof-of-shipment photo (user side)

- `returns` table: add `proof_images jsonb not null default '[]'`.
- `ReturnAwbForm`: add image upload, reusing `OrderComplaintForm`'s existing upload widget + `/api/complaint-upload` route (same MIME allowlist, max 5 files).
- `submitReturnAWBAction(returnId, awb, courier, proofImages)`: store the URLs.
- `ReturnManager` (admin): render the proof photos next to the AWB/courier block.

---

## Out of Scope (unchanged from original spec)

- Refund/cash-back — existing cancel-order flow, not touched.
- Realtime chat — already shipped in an earlier session (`complaint_messages` added to Realtime publication).
- New rows in `orders` for the replacement — still tracked only via `return_shipments`.

---

## Files Touched

| File | Change |
|------|--------|
| `components/dashboard/order-complaint-form.tsx` | Add resolution-intent choice, pass as `type` |
| `app/(dashboard)/dashboard/orders/_actions.ts` | `submitComplaintAction` accepts + stores `type`; `submitReturnAWBAction` accepts + stores `proofImages` |
| `components/dashboard/return-awb-form.tsx` | Add photo upload UI (reuse existing upload pattern) |
| `app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx` | Un-gate `<ReturnManager>` from `type`; add buyer-intent hint label |
| `app/admin/(panel)/complaints/[id]/_components/return-manager.tsx` | Render `proof_images` |
| `lib/data/complaints.ts` | Select `proof_images` in return query |
| `supabase/migrations/` | `ALTER TABLE returns ADD COLUMN proof_images jsonb NOT NULL DEFAULT '[]'` |

---

## Testing

Manual: file a complaint choosing "Tukar barang" → admin sees "Setujui Retur" available at `in_review` → approve → user sees ship-back form with photo upload → submit → admin sees AWB + photo + "Konfirmasi Terima Barang" → confirm → admin creates replacement shipment → user tracks at `/dashboard/orders/[id]/return`, admin sees it listed at `/admin/returns`. Repeat once choosing "Lainnya" and confirm admin can still click "Setujui Retur" anyway (override case).
