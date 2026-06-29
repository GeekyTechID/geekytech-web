import Link from "next/link";

import { Button } from "@/components/ui/button";
import { notFound, redirect } from "next/navigation";
import { Clock, MapPin, Package, Truck } from "lucide-react";
import { StarRatingDisplay } from "@/components/shared/star-rating-display";

import { PaymentCountdown } from "@/components/dashboard/payment-countdown";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  fetchOrderDetailForUser,
  fetchReviewedProductIdsForOrder,
  fetchReviewsForOrder,
  type DashboardOrderItemRow,
} from "@/lib/data/dashboard-user";
import { cancelExpiredOrder } from "@/lib/orders/cancel-expired";
import { orderStatusLabel } from "@/lib/constants/order-status-labels";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/payment-method-labels";
import { formatDate, formatRupiah } from "@/lib/format";
import { OrderToolbar } from "@/components/dashboard/order-toolbar";
import type { Database } from "@/types/supabase";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const PROBLEM_PAYMENT: PaymentStatus[] = ["failed", "expired", "cancelled"];

const COURIER_CODE_LABELS: Record<string, string> = {
  jne: "JNE",
  sicepat: "SiCepat",
  anteraja: "AnterAja",
  tiki: "TIKI",
  gosend: "GoSend",
  grab: "Grab Express",
  jnt: "J&T Express",
  pos: "POS Indonesia",
};

function courierLabel(code: string | null): string {
  if (!code) return "—";
  return COURIER_CODE_LABELS[code.toLowerCase()] ?? code.toUpperCase();
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, { label: string; cls: string }> = {
  pending:   { label: "Menunggu pembayaran", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" },
  paid:      { label: "Lunas",               cls: "bg-green-50 text-green-700 ring-1 ring-green-100" },
  failed:    { label: "Gagal",               cls: "bg-red-50 text-red-600 ring-1 ring-red-100" },
  expired:   { label: "Kedaluwarsa",         cls: "bg-[#f5f5f7] text-[#5c5c5c] ring-1 ring-[#e0e0e0]" },
  cancelled: { label: "Dibatalkan",          cls: "bg-red-50 text-red-600 ring-1 ring-red-100" },
  refunded:  { label: "Dikembalikan",        cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-100" },
  challenge: { label: "Perlu verifikasi",    cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" },
};

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  paid:            "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  processing:      "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  shipped:         "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  delivered:       "bg-green-50 text-green-700 ring-1 ring-green-100",
  completed:       "bg-green-50 text-green-700 ring-1 ring-green-100",
  cancelled:       "bg-red-50 text-red-600 ring-1 ring-red-100",
  refunded:        "bg-[#f5f5f7] text-[#5c5c5c] ring-1 ring-[#e0e0e0]",
};

async function fetchMidtransVA(orderNumber: string): Promise<{
  va_number: string | null;
  payment_code: string | null;
  expiry_time: string | null;
  midtrans_transaction_id: string | null;
} | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return null;
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
  const creds = Buffer.from(`${serverKey}:`).toString("base64");
  try {
    const res = await fetch(`${base}/v2/${encodeURIComponent(orderNumber)}/status`, {
      headers: { Authorization: `Basic ${creds}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      va_numbers?: { bank: string; va_number: string }[];
      payment_code?: string;
      expiry_time?: string;
      transaction_id?: string;
    };
    const rawExpiry = data.expiry_time ?? null;
    return {
      va_number: data.va_numbers?.[0]?.va_number ?? null,
      payment_code: data.payment_code ?? null,
      expiry_time: rawExpiry ? rawExpiry.replace(" ", "T") + "+07:00" : null,
      midtrans_transaction_id: data.transaction_id ?? null,
    };
  } catch {
    return null;
  }
}

export default async function DashboardOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}`);

  const [detail, reviewedIds, existingReviews, profileRow] = await Promise.all([
    fetchOrderDetailForUser(user.id, id),
    fetchReviewedProductIdsForOrder(user.id, id),
    fetchReviewsForOrder(user.id, id),
    supabase
      .from("profiles")
      .select("bank_name, bank_account_name, bank_account_number")
      .eq("id", user.id)
      .maybeSingle()
      .then((r) => r.data),
  ]);
  if (!detail) notFound();

  const { order, items, shipments } = detail;
  const payments = [...detail.payments];

  const cancelNote = order.status === "cancelled"
    ? detail.statusHistory.slice().reverse().find((h) => h.status === "cancelled")?.note ?? null
    : null;

  // Sync VA/payment code from Midtrans if still pending and not yet stored
  if (order.status === "pending_payment") {
    const ppIdx = payments.findIndex((p) => p.status === "pending");
    if (ppIdx !== -1) {
      const pp = payments[ppIdx]!;
      if (!pp.va_number && !pp.payment_code) {
        const synced = await fetchMidtransVA(order.order_number);
        if (synced && (synced.va_number ?? synced.payment_code ?? synced.midtrans_transaction_id)) {
          const svc = createServiceClient();
          await svc
            .from("payments")
            .update({
              va_number: synced.va_number,
              payment_code: synced.payment_code,
              expiry_time: synced.expiry_time ?? pp.expiry_time,
              midtrans_transaction_id: synced.midtrans_transaction_id,
            })
            .eq("id", pp.id);
          payments[ppIdx] = {
            ...pp,
            va_number: synced.va_number,
            payment_code: synced.payment_code,
            expiry_time: synced.expiry_time ?? pp.expiry_time,
            midtrans_transaction_id: synced.midtrans_transaction_id,
          };
        }
      }
    }
  }

  const reviewableItems = items.filter((it) => it.product_id);
  const allReviewed = reviewableItems.length > 0 && reviewableItems.every((it) => reviewedIds.includes(it.product_id!));
  const itemByProductId = items.reduce<Record<string, DashboardOrderItemRow>>(
    (acc, it) => { if (it.product_id) acc[it.product_id] = it; return acc; },
    {},
  );
  const hasPendingPayment = payments.some((p) => p.status === "pending");
  const paidPayment = payments.find((p) => p.status === "paid");
  const problemPayments = payments.filter((p) => PROBLEM_PAYMENT.includes(p.status));
  const hasShipment =
    order.status !== "cancelled" &&
    order.status !== "refunded" &&
    (shipments.length > 0 || order.status === "shipped" || order.status === "delivered");

  // Most recent pending payment, fallback to any payment record
  const pendingPayment = payments.find((p) => p.status === "pending") ?? payments[0] ?? null;
  // Expiry fallback: created_at + 24 hours to match Midtrans default window
  const expiryFallback = new Date(new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const paymentExpiry = pendingPayment?.expiry_time ?? expiryFallback;
  // Payment window already closed — hide the "Menunggu pembayaran" block.
  // The cron /api/cron/expire-orders will cancel the order asynchronously.
  const paymentExpired = new Date(paymentExpiry).getTime() <= Date.now();

  // Lazy-cancel: jika user membuka halaman ini saat waktu bayar sudah habis,
  // langsung batalkan di DB dan redirect agar status tampil "Dibatalkan".
  // Cron menjadi fallback untuk pesanan yang tidak pernah dibuka.
  if (order.status === "pending_payment" && paymentExpired) {
    try {
      await cancelExpiredOrder(order.id);
    } catch {
      // DB error — lanjut render; cron akan retry
    }
    redirect(`/dashboard/orders/${id}`);
  }

  return (
    <div className="space-y-6">
      {/* ── Pending payment details — shown only while window is still open ── */}
      {order.status === "pending_payment" && !paymentExpired && (
        <div className="overflow-hidden rounded-2xl border border-[#EA5329]/20 bg-[#FFF8F5]">
          {/* Header: title + countdown pill */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EA5329]/10">
                <Clock className="h-4 w-4 text-[#EA5329]" />
              </span>
              <span className="text-[15px] font-semibold text-[#1d1d1f]">Menunggu pembayaran</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#EA5329]/20">
              <Clock className="h-3 w-3 shrink-0 text-[#EA5329]" />
              <PaymentCountdown expiryTime={paymentExpiry} />
            </div>
          </div>

          {/* Amount */}
          <div className="border-t border-[#EA5329]/10 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#EA5329]/70">
              Total yang harus dibayar
            </p>
            <p className="mt-1 text-[28px] font-black tabular-nums leading-none text-[#1d1d1f]">
              {formatRupiah(pendingPayment?.gross_amount ?? order.total)}
            </p>
          </div>

          {/* Info grid */}
          <div className="border-t border-[#EA5329]/10 px-5 pb-5 pt-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              {pendingPayment?.payment_type ? (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-[#7a7a7a]">
                    Metode pembayaran
                  </dt>
                  <dd className="mt-1.5 text-[14px] font-semibold text-[#1d1d1f]">
                    {PAYMENT_METHOD_LABELS[pendingPayment.payment_type] ?? pendingPayment.payment_type}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-[#7a7a7a]">
                  Batas waktu bayar
                </dt>
                <dd className="mt-1.5 text-[14px] font-medium text-[#1d1d1f]">
                  {formatDate(paymentExpiry, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>

            {/* VA / payment code / transaction ID — prominent copy chip */}
            {(pendingPayment?.va_number ||
              pendingPayment?.payment_code ||
              pendingPayment?.midtrans_transaction_id) && (
              <div className="mt-4">
                {pendingPayment.va_number ? (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a7a7a]">
                      Nomor Virtual Account
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-[#EA5329]/15">
                      <span className="min-w-0 flex-1 select-all font-mono text-[22px] font-black tracking-widest text-[#1d1d1f]">
                        {pendingPayment.va_number}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#aaa]">tap untuk salin</span>
                    </div>
                  </>
                ) : pendingPayment.payment_code ? (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a7a7a]">
                      Kode pembayaran
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-[#EA5329]/15">
                      <span className="min-w-0 flex-1 select-all font-mono text-[22px] font-black tracking-widest text-[#1d1d1f]">
                        {pendingPayment.payment_code}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#aaa]">tap untuk salin</span>
                    </div>
                  </>
                ) : pendingPayment.midtrans_transaction_id ? (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a7a7a]">
                      No. Transaksi
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-[#EA5329]/15">
                      <span className="min-w-0 flex-1 select-all truncate font-mono text-sm font-bold text-[#1d1d1f]">
                        {pendingPayment.midtrans_transaction_id}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {pendingPayment?.pdf_url ? (
              <a
                href={pendingPayment.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#EA5329] underline-offset-2 hover:underline"
              >
                Unduh instruksi pembayaran (PDF) ↗
              </a>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Header card ── */}
      <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-[#7a7a7a]">ID Transaksi</p>
            <p className="mt-1 font-mono text-base font-bold text-[#1d1d1f]">{order.order_number}</p>
            <p className="mt-1 text-xs text-[#7a7a7a]">
              {formatDate(order.created_at, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[order.status]}`}>
              {orderStatusLabel(order.status)}
            </span>
            {cancelNote && (
              <p className="max-w-[220px] text-right text-[11px] leading-snug text-red-500 sm:max-w-[240px]">
                {cancelNote}
              </p>
            )}
            <p className="text-2xl font-black tabular-nums text-[#1d1d1f]">{formatRupiah(order.total)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-[#f0f0f0] pt-6 sm:grid-cols-2">
          <div className="flex gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#EA5329]" />
            <div>
              <p className="text-[11px] font-bold uppercase text-[#7a7a7a]">Penerima</p>
              <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">{order.recipient_name}</p>
              <p className="text-sm text-[#5c5c5c]">{order.recipient_phone}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#5c5c5c]">
                {order.shipping_address}, {order.shipping_district}, {order.shipping_city}{" "}
                {order.shipping_province} {order.shipping_postal}
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#EA5329]" />
            <div>
              <p className="text-[11px] font-bold uppercase text-[#7a7a7a]">Kurir</p>
              <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                {courierLabel(order.courier_company)} · {order.courier_service ?? "—"}
              </p>
              {order.courier_etd ? (
                <p className="text-sm text-[#5c5c5c]">Estimasi: {order.courier_etd}</p>
              ) : null}
              {shipments[0]?.awb ? (
                <p className="mt-1 font-mono text-xs text-[#7a7a7a]">AWB: {shipments[0].awb}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#f0f0f0] pt-5">
          {hasShipment && (
            <Button asChild variant="secondary" size="sm" className="gap-1.5">
              <Link href={`/dashboard/orders/${id}/tracking`}>
                <Package className="h-4 w-4" />
                Lacak Pengiriman
              </Link>
            </Button>
          )}
          <OrderToolbar
            orderId={order.id}
            orderNumber={order.order_number}
            status={order.status}
            paymentType={paidPayment?.payment_type}
            savedBank={profileRow}
            allReviewed={allReviewed}
          />
        </div>
      </div>

      {/* ── Items ── */}
      <section>
        <h2 className="mb-3 text-base font-bold text-[#1d1d1f]">Item pesanan</h2>
        <ul className="divide-y divide-[#f0f0f0] rounded-xl border border-[#e0e0e0] bg-white">
          {items.map((line) => (
            <li key={line.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:gap-4">
              <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#fafafa] sm:mx-0 sm:h-16 sm:w-16">
                {line.image_url ? (
                  <img src={line.image_url} alt="" className="h-full w-full object-contain p-1" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1d1d1f]">{line.product_name}</p>
                <p className="text-xs text-[#7a7a7a]">
                  {line.variant_name} · SKU {line.sku}
                </p>
                <p className="mt-1 text-sm text-[#5c5c5c]">
                  {line.quantity} × {formatRupiah(line.price)}
                </p>
                {line.product_slug ? (
                  <Link
                    href={`/products/${line.product_slug}`}
                    className="mt-1.5 inline-block text-xs font-semibold text-[#EA5329] underline-offset-2 hover:underline"
                  >
                    Lihat produk
                  </Link>
                ) : null}
              </div>
              <p className="w-full text-right text-base font-bold tabular-nums text-[#1d1d1f] sm:w-auto sm:shrink-0 sm:self-start sm:text-sm">
                {formatRupiah(line.subtotal)}
              </p>
            </li>
          ))}
          {/* Total row */}
          <li className="flex justify-between gap-4 px-4 py-3">
            <span className="text-sm text-[#7a7a7a]">Subtotal produk</span>
            <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.subtotal)}</span>
          </li>
          {order.discount_amount > 0 && (
            <li className="flex justify-between gap-4 px-4 py-3">
              <span className="text-sm text-[#7a7a7a]">Diskon</span>
              <span className="text-sm font-semibold tabular-nums text-[#EA5329]">−{formatRupiah(order.discount_amount)}</span>
            </li>
          )}
          <li className="flex justify-between gap-4 px-4 py-3">
            <span className="text-sm text-[#7a7a7a]">Ongkir</span>
            <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.shipping_cost)}</span>
          </li>
          {order.app_fee > 0 && (
            <li className="flex justify-between gap-4 px-4 py-3">
              <span className="text-sm text-[#7a7a7a]">Biaya jasa aplikasi</span>
              <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.app_fee)}</span>
            </li>
          )}
          <li className="flex justify-between gap-4 bg-[#fafafa] px-4 py-3">
            <span className="text-sm font-bold text-[#1d1d1f]">Total</span>
            <span className="text-sm font-black tabular-nums text-[#1d1d1f]">{formatRupiah(order.total)}</span>
          </li>
        </ul>
      </section>

      {/* ── Payment ── */}
      <section>
        <h2 className="mb-3 text-base font-bold text-[#1d1d1f]">Pembayaran</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-[#5c5c5c]">Belum ada catatan pembayaran.</p>
        ) : (
          <div className="rounded-xl border border-[#e0e0e0] bg-white">
            {/* Paid payment — primary */}
            {paidPayment ? (
              <div className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLES.paid.cls}`}>
                    {PAYMENT_STATUS_STYLES.paid.label}
                  </span>
                  <span className="text-lg font-black tabular-nums text-[#1d1d1f]">
                    {formatRupiah(paidPayment.gross_amount)}
                  </span>
                </div>
                <dl className="mt-4 grid gap-y-2.5 gap-x-4 text-sm sm:grid-cols-2">
                  {paidPayment.payment_type ? (
                    <div>
                      <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Metode</dt>
                      <dd className="mt-0.5 font-medium text-[#1d1d1f]">
                        {PAYMENT_METHOD_LABELS[paidPayment.payment_type] ?? paidPayment.payment_type}
                      </dd>
                    </div>
                  ) : null}
                  {paidPayment.paid_at ? (
                    <div>
                      <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Waktu bayar</dt>
                      <dd className="mt-0.5 text-[#1d1d1f]">
                        {formatDate(paidPayment.paid_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </dd>
                    </div>
                  ) : null}
                  {paidPayment.va_number ? (
                    <div>
                      <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Nomor VA</dt>
                      <dd className="mt-0.5 font-mono text-[#1d1d1f]">{paidPayment.va_number}</dd>
                    </div>
                  ) : null}
                  {paidPayment.midtrans_transaction_id ? (
                    <div>
                      <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">ID Transaksi Midtrans</dt>
                      <dd className="mt-0.5 font-mono text-xs text-[#5c5c5c]">{paidPayment.midtrans_transaction_id}</dd>
                    </div>
                  ) : null}
                </dl>
                {paidPayment.pdf_url ? (
                  <a
                    href={paidPayment.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-xs font-semibold text-[#EA5329] hover:underline"
                  >
                    Unduh bukti pembayaran (PDF) ↗
                  </a>
                ) : null}
              </div>
            ) : (
              /* Pending payment */
              payments.filter((p) => p.status === "pending").map((p) => (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLES.pending.cls}`}>
                      {PAYMENT_STATUS_STYLES.pending.label}
                    </span>
                    <span className="text-lg font-black tabular-nums text-[#1d1d1f]">{formatRupiah(p.gross_amount)}</span>
                  </div>
                  <dl className="mt-4 grid gap-y-3 gap-x-4 text-sm sm:grid-cols-2">
                    {p.payment_type ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Metode</dt>
                        <dd className="mt-1 font-medium text-[#1d1d1f]">
                          {PAYMENT_METHOD_LABELS[p.payment_type] ?? p.payment_type}
                        </dd>
                      </div>
                    ) : null}
                    {p.expiry_time ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Batas bayar</dt>
                        <dd className="mt-1 text-[#1d1d1f]">
                          {formatDate(p.expiry_time, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {(p.va_number || p.payment_code) && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase text-[#7a7a7a]">
                        {p.va_number ? "Nomor VA" : "Kode bayar"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 rounded-xl bg-[#f5f5f7] px-4 py-2.5">
                        <span className="min-w-0 flex-1 select-all font-mono text-base font-bold tracking-widest text-[#1d1d1f]">
                          {p.va_number ?? p.payment_code}
                        </span>
                        <span className="shrink-0 text-[11px] text-[#aaa]">tap untuk salin</span>
                      </div>
                    </div>
                  )}
                  {p.pdf_url ? (
                    <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#EA5329] underline-offset-2 hover:underline">
                      Instruksi pembayaran (PDF) ↗
                    </a>
                  ) : null}
                </div>
              ))
            )}

            {/* Problem payments */}
            {problemPayments.length > 0 ? (
              <div className="border-t border-[#f0f0f0] px-5 py-4">
                <p className="text-xs font-bold uppercase text-[#7a7a7a]">Riwayat percobaan</p>
                <ul className="mt-2 space-y-1">
                  {problemPayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 text-xs text-[#5c5c5c]">
                      <span>
                        {formatDate(p.created_at, { day: "numeric", month: "short", year: "numeric" })} —{" "}
                        <span className={`font-semibold ${PAYMENT_STATUS_STYLES[p.status].cls.replace("ring-1", "").trim()} rounded px-1.5 py-0.5`}>
                          {PAYMENT_STATUS_STYLES[p.status].label}
                        </span>
                      </span>
                      <span className="tabular-nums">{formatRupiah(p.gross_amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Ulasan saya ── */}
      {existingReviews.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-[#1d1d1f]">Ulasan saya</h2>
          <ul className="divide-y divide-[#f0f0f0] rounded-xl border border-[#e0e0e0] bg-white">
            {existingReviews.map((review) => {
              const item = itemByProductId[review.product_id];
              return (
                <li key={review.id} className="flex gap-4 px-4 py-4 sm:gap-5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#fafafa]">
                    {item?.image_url ? (
                      <img src={item.image_url} alt="" className="h-full w-full object-contain p-1" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1d1d1f]">
                      {item?.product_name ?? "Produk"}
                    </p>
                    {item?.variant_name ? (
                      <p className="text-xs text-[#7a7a7a]">{item.variant_name}</p>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-2">
                      <StarRatingDisplay rating={review.rating} />
                      <span className="text-xs text-[#7a7a7a]">
                        {formatDate(review.created_at, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-[#5c5c5c]">{review.comment}</p>
                    ) : null}
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        review.is_approved
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {review.is_approved ? "Ditampilkan" : "Menunggu moderasi"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
