import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MapPin, Package, Truck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { orderStatusLabel } from "@/lib/constants/order-status-labels";
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bca_va: "BCA Virtual Account",
  bni_va: "BNI Virtual Account",
  bri_va: "BRI Virtual Account",
  permata_va: "Permata Virtual Account",
  echannel: "Mandiri Bill Payment",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  qris: "QRIS",
  indomaret: "Indomaret",
  alfamart: "Alfamart",
  credit_card: "Kartu Kredit",
};

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

export default async function DashboardOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const { order, items, payments, shipments } = detail;
  const hasPendingPayment = payments.some((p) => p.status === "pending");
  const paidPayment = payments.find((p) => p.status === "paid");
  const problemPayments = payments.filter((p) => PROBLEM_PAYMENT.includes(p.status));
  const hasShipment = shipments.length > 0 || order.status === "shipped" || order.status === "delivered";

  return (
    <div className="space-y-6">
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
            <Link
              href={`/dashboard/orders/${id}/tracking`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e0e0e0] bg-white px-4 py-2 text-sm font-semibold text-[#1d1d1f] transition hover:border-[#EA5329]/50 hover:text-[#EA5329] active:scale-[0.97]"
            >
              <Package className="h-4 w-4" />
              Lacak Pengiriman
            </Link>
          )}
          <OrderToolbar
            orderId={order.id}
            orderNumber={order.order_number}
            status={order.status}
            hasPendingPayment={hasPendingPayment}
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
                  <dl className="mt-4 grid gap-y-2.5 gap-x-4 text-sm sm:grid-cols-2">
                    {p.payment_type ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Metode</dt>
                        <dd className="mt-0.5 font-medium text-[#1d1d1f]">
                          {PAYMENT_METHOD_LABELS[p.payment_type] ?? p.payment_type}
                        </dd>
                      </div>
                    ) : null}
                    {p.va_number ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Nomor VA</dt>
                        <dd className="mt-0.5 font-mono text-[#1d1d1f]">{p.va_number}</dd>
                      </div>
                    ) : null}
                    {p.payment_code ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Kode bayar</dt>
                        <dd className="mt-0.5 font-mono text-[#1d1d1f]">{p.payment_code}</dd>
                      </div>
                    ) : null}
                    {p.expiry_time ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase text-[#7a7a7a]">Batas bayar</dt>
                        <dd className="mt-0.5 text-[#1d1d1f]">
                          {formatDate(p.expiry_time, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {p.pdf_url ? (
                    <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs font-semibold text-[#EA5329] hover:underline">
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
    </div>
  );
}
