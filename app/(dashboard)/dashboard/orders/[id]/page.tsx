import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { orderStatusLabel } from "@/lib/constants/order-status-labels";
import { paymentStatusLabel } from "@/lib/constants/payment-status-labels";
import { formatDate, formatRupiah } from "@/lib/format";
import { OrderToolbar } from "@/components/dashboard/order-toolbar";
import type { Database } from "@/types/supabase";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const PROBLEM_PAYMENT: PaymentStatus[] = ["failed", "expired", "cancelled"];

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
  const problemPayments = payments.filter((p) => PROBLEM_PAYMENT.includes(p.status));

  return (
    <div>
      <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">Status</p>
            <p className="mt-1 text-lg font-bold text-[#1d1d1f]">{orderStatusLabel(order.status)}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">Dibuat</p>
            <p className="mt-1 text-sm text-[#1d1d1f]">{formatDate(order.created_at, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">Total</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-[#1d1d1f]">{formatRupiah(order.total)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 border-t border-[#e0e0e0] pt-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a]">Penerima</p>
            <p className="mt-2 text-sm font-semibold text-[#1d1d1f]">{order.recipient_name}</p>
            <p className="text-sm text-[#5c5c5c]">{order.recipient_phone}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a]">Alamat kirim</p>
            <p className="mt-2 text-sm leading-relaxed text-[#1d1d1f]">
              {order.shipping_address}, {order.shipping_district}, {order.shipping_city} {order.shipping_province}{" "}
              {order.shipping_postal}
            </p>
          </div>
        </div>

        <OrderToolbar
          orderId={order.id}
          orderNumber={order.order_number}
          status={order.status}
          hasPendingPayment={hasPendingPayment}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#1d1d1f]">Item pesanan</h2>
        <ul className="mt-4 divide-y divide-[#e0e0e0] rounded-xl border border-[#e0e0e0] bg-white">
          {items.map((line) => (
            <li key={line.id} className="flex gap-4 px-4 py-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#fafafa]">
                {line.image_url ? <img src={line.image_url} alt="" className="h-full w-full object-cover" /> : null}
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
                  <Link href={`/products/${line.product_slug}`} className="mt-2 inline-block text-xs font-semibold text-[#EA5329] underline-offset-2 hover:underline">
                    Lihat produk
                  </Link>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-[#1d1d1f]">{formatRupiah(line.subtotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#1d1d1f]">Pembayaran</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-[#5c5c5c]">Belum ada catatan pembayaran.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {payments.map((p) => (
              <li key={p.id} className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1d1d1f]">{paymentStatusLabel(p.status)}</p>
                  <p className="text-sm font-bold tabular-nums">{formatRupiah(p.gross_amount)}</p>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[#5c5c5c]">
                  {p.payment_type ? <p>Tipe: {p.payment_type}</p> : null}
                  {p.va_number ? <p>VA: {p.va_number}</p> : null}
                  {p.payment_code ? <p>Kode: {p.payment_code}</p> : null}
                  {p.expiry_time ? <p>Kedaluwarsa: {formatDate(p.expiry_time, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p> : null}
                  {p.pdf_url ? (
                    <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#EA5329] underline">
                      Instruksi bayar (PDF)
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {problemPayments.length > 0 ? (
        <section className="mt-10 rounded-xl border border-red-200 bg-red-50/50 p-5">
          <h2 className="text-lg font-bold text-red-800">Percobaan bayar bermasalah</h2>
          <ul className="mt-3 space-y-2 text-sm text-red-900">
            {problemPayments.map((p) => (
              <li key={p.id}>
                {formatDate(p.created_at)} — {paymentStatusLabel(p.status)} — {formatRupiah(p.gross_amount)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#1d1d1f]">Pengiriman</h2>
        {shipments.length === 0 ? (
          <p className="mt-3 text-sm text-[#5c5c5c]">Belum ada data kurir untuk pesanan ini.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {shipments.map((s) => (
              <li key={s.id} className="rounded-xl border border-[#e0e0e0] bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-[#1d1d1f]">
                  {s.courier_company} — {s.courier_service}
                </p>
                {s.awb ? <p className="mt-1 font-mono text-xs">AWB: {s.awb}</p> : null}
                <p className="mt-1 text-xs uppercase tracking-wide text-[#7a7a7a]">{s.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
