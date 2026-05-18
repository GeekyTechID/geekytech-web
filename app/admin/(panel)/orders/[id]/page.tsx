import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Package, Phone, User } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_ORDER_STATUS_LABEL, adminOrderStatusBadgeClass } from "@/lib/admin/order-status-ui";
import { StatusUpdater } from "./_components/status-updater";
import { AWBForm } from "./_components/awb-form";
import type { OrderStatus } from "../_actions";

export const metadata: Metadata = { title: "Detail Pesanan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// ─── Status config ────────────────────────────────────────────────────────────

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
    <div className="w-full space-y-8 p-6 lg:p-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/orders" className="admin-text-link font-medium">
          Pesanan
        </Link>
        <ChevronRight size={12} className="shrink-0 opacity-60" />
        <span className="font-mono font-semibold text-foreground">{order.order_number}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Transaksi</p>
          <h1 className="font-mono text-[34px] font-semibold uppercase text-foreground">
            {order.order_number}
          </h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
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
            "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase",
            adminOrderStatusBadgeClass(order.status),
          )}
        >
          {ADMIN_ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Items + Payment + History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">
                Item Pesanan ({items.length})
              </h2>
            </div>
            <div className="divide-y divide-[#e0e0e0] dark:divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 px-4 py-3">
                  {/* Image */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted dark:border-border">
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
                      <p className="text-xs font-semibold">{formatRupiah(item.subtotal)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.quantity} × {formatRupiah(item.price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 border-t border-[#e0e0e0] bg-muted/30 px-4 py-3 dark:border-border">
              <Row label="Subtotal" value={formatRupiah(order.subtotal)} />
              <Row label={`Ongkir (${order.courier_company ?? "—"} ${order.courier_service ?? ""})`} value={formatRupiah(order.shipping_cost)} />
              {order.shipping_insurance > 0 && (
                <Row label="Asuransi Pengiriman" value={formatRupiah(order.shipping_insurance)} />
              )}
              {order.discount_amount > 0 && (
                <Row label={`Diskon${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`-${formatRupiah(order.discount_amount)}`} className="text-emerald-600 dark:text-emerald-400" />
              )}
              <div className="border-t border-[#e0e0e0] pt-1.5 dark:border-border">
                <Row label="Total" value={formatRupiah(order.total)} bold />
              </div>
            </div>
          </section>

          {/* Payment Info */}
          {payment && (
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Info Pembayaran</h2>
              </div>
              <div className="space-y-2 px-4 py-4">
                <InfoRow label="Status" value={
                  <span className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                    payment.status === "paid"
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
                      : payment.status === "pending"
                        ? "bg-brand/10 text-brand"
                        : "bg-destructive/10 text-destructive dark:text-destructive"
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
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Riwayat Status</h2>
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
                            ? "border-brand bg-brand"
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
                            "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                            adminOrderStatusBadgeClass(h.status)
                          )}>
                            {ADMIN_ORDER_STATUS_LABEL[h.status] ?? h.status}
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
        <div className="space-y-6">
          {/* Customer & Shipping */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Penerima</h2>
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
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Pengiriman</h2>
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
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Catatan</h2>
              </div>
              <p className="px-4 py-3 text-sm text-muted-foreground">{order.notes}</p>
            </section>
          )}

          {/* Status Updater */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Update Status</h2>
            </div>
            <div className="px-4 py-4">
              <StatusUpdater
                orderId={order.id}
                currentStatus={order.status as OrderStatus}
              />
            </div>
          </section>

          {/* AWB Input */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Input Resi Manual</h2>
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
      <span className={cn(bold && "text-sm font-semibold", className)}>{value}</span>
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
