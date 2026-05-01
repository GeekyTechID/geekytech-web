import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Package, Phone, User } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusUpdater } from "./_components/status-updater";
import { AWBForm } from "./_components/awb-form";
import type { OrderStatus } from "../_actions";

export const metadata: Metadata = { title: "Detail Pesanan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Menunggu Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  challenge: "Perlu Review",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: history }] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        *,
        order_items(*),
        payments(*),
        shipments(*)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("order_status_history")
      .select("id, status, note, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!order) notFound();

  const payment = Array.isArray(order.payments) ? order.payments[0] : null;
  const shipment = Array.isArray(order.shipments) ? order.shipments[0] : null;
  const items = Array.isArray(order.order_items) ? order.order_items : [];

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/orders" className="font-medium transition-colors hover:text-foreground">
          Pesanan
        </Link>
        <ChevronRight size={12} />
        <span className="font-mono font-bold text-foreground">{order.order_number}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-black tracking-tight">{order.order_number}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(order.created_at, {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={cn(
            "px-3 py-1 text-xs font-bold uppercase tracking-widest",
            STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"
          )}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Items + Payment + History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <section className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">
                Item Pesanan ({items.length})
              </h2>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 px-4 py-3">
                  {/* Image */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden border border-border bg-muted">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={16} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold leading-tight">{item.product_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.variant_name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        SKU: {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{formatRupiah(item.subtotal)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.quantity} × {formatRupiah(item.price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 border-t border-border bg-muted/30 px-4 py-3">
              <Row label="Subtotal" value={formatRupiah(order.subtotal)} />
              <Row label={`Ongkir (${order.courier_company ?? "—"} ${order.courier_service ?? ""})`} value={formatRupiah(order.shipping_cost)} />
              {order.shipping_insurance > 0 && (
                <Row label="Asuransi Pengiriman" value={formatRupiah(order.shipping_insurance)} />
              )}
              {order.discount_amount > 0 && (
                <Row label={`Diskon${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`-${formatRupiah(order.discount_amount)}`} className="text-green-600" />
              )}
              <div className="border-t border-border pt-1.5">
                <Row label="Total" value={formatRupiah(order.total)} bold />
              </div>
            </div>
          </section>

          {/* Payment Info */}
          {payment && (
            <section className="border border-border">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-black uppercase tracking-widest">Info Pembayaran</h2>
              </div>
              <div className="space-y-2 px-4 py-4">
                <InfoRow label="Status" value={
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                    payment.status === "paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : payment.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  )}>
                    {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                  </span>
                } />
                {payment.payment_type && (
                  <InfoRow label="Metode" value={payment.payment_type.replace(/_/g, " ").toUpperCase()} />
                )}
                {payment.va_number && (
                  <InfoRow label="No. VA" value={<span className="font-mono">{payment.va_number}</span>} />
                )}
                {payment.payment_code && (
                  <InfoRow label="Kode Bayar" value={<span className="font-mono">{payment.payment_code}</span>} />
                )}
                {payment.midtrans_transaction_id && (
                  <InfoRow label="Transaction ID" value={<span className="font-mono text-[11px]">{payment.midtrans_transaction_id}</span>} />
                )}
                <InfoRow label="Jumlah" value={formatRupiah(payment.gross_amount)} />
                {payment.paid_at && (
                  <InfoRow label="Dibayar" value={formatDate(payment.paid_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                )}
                {payment.expiry_time && !payment.paid_at && (
                  <InfoRow label="Batas Bayar" value={formatDate(payment.expiry_time, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                )}
              </div>
            </section>
          )}

          {/* Status History */}
          {history && history.length > 0 && (
            <section className="border border-border">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-black uppercase tracking-widest">Riwayat Status</h2>
              </div>
              <div className="px-4 py-4">
                <ol className="space-y-3">
                  {history.map((h, i) => (
                    <li key={h.id} className="flex gap-3">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full border-2",
                          i === history.length - 1
                            ? "border-foreground bg-foreground"
                            : "border-muted-foreground bg-background"
                        )} />
                        {i < history.length - 1 && (
                          <div className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                            STATUS_COLORS[h.status] ?? "bg-gray-100 text-gray-700"
                          )}>
                            {STATUS_LABELS[h.status] ?? h.status}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(h.created_at, {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {h.note && (
                          <p className="mt-1 text-xs text-muted-foreground">{h.note}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>

        {/* Right: Summary + Actions */}
        <div className="space-y-4">
          {/* Customer & Shipping */}
          <section className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Penerima</h2>
            </div>
            <div className="space-y-2.5 px-4 py-4 text-sm">
              <div className="flex items-start gap-2">
                <User size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="font-semibold">{order.recipient_name}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="text-sm">{order.recipient_phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p>{order.shipping_address}</p>
                  <p>{order.shipping_district}, {order.shipping_city}</p>
                  <p>{order.shipping_province} {order.shipping_postal}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Courier */}
          {(order.courier_company || shipment) && (
            <section className="border border-border">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-black uppercase tracking-widest">Pengiriman</h2>
              </div>
              <div className="space-y-2 px-4 py-4">
                {order.courier_company && (
                  <InfoRow
                    label="Kurir"
                    value={`${order.courier_company.toUpperCase()} — ${order.courier_service ?? ""}`}
                  />
                )}
                {order.courier_etd && (
                  <InfoRow label="Estimasi" value={`${order.courier_etd} hari`} />
                )}
                {shipment?.awb && (
                  <InfoRow label="Nomor Resi" value={<span className="font-mono font-semibold">{shipment.awb}</span>} />
                )}
                {shipment?.status && (
                  <InfoRow label="Status Kurir" value={shipment.status.replace(/_/g, " ").toUpperCase()} />
                )}
              </div>
            </section>
          )}

          {/* Notes */}
          {order.notes && (
            <section className="border border-border">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-black uppercase tracking-widest">Catatan</h2>
              </div>
              <p className="px-4 py-3 text-sm text-muted-foreground">{order.notes}</p>
            </section>
          )}

          {/* Status Updater */}
          <section className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Update Status</h2>
            </div>
            <div className="px-4 py-4">
              <StatusUpdater
                orderId={order.id}
                currentStatus={order.status as OrderStatus}
              />
            </div>
          </section>

          {/* AWB Input */}
          <section className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Input Resi Manual</h2>
            </div>
            <div className="px-4 py-4">
              <AWBForm orderId={order.id} currentAWB={shipment?.awb} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && "font-bold text-sm", className)}>{value}</span>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
