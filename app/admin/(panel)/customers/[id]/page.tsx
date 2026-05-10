import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_ORDER_STATUS_LABEL, adminOrderStatusBadgeClass } from "@/lib/admin/order-status-ui";

export const metadata: Metadata = { title: "Detail Pelanggan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const [supabase, serviceSupabase] = await Promise.all([createClient(), createServiceClient()]);

  const [{ data: profile }, { data: authUser }, { data: orders }, { data: addresses }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      serviceSupabase.auth.admin.getUserById(id),
      supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, recipient_name")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("addresses").select("*").eq("user_id", id).order("is_default", { ascending: false }),
    ]);

  if (!profile) notFound();

  const email = authUser?.user?.email ?? null;
  const lastSignIn = authUser?.user?.last_sign_in_at ?? null;

  const totalOrders = orders?.length ?? 0;
  const totalSpent = orders?.reduce((sum, o) => sum + o.total, 0) ?? 0;
  const completedOrders =
    orders?.filter((o) => ["completed", "delivered"].includes(o.status)).length ?? 0;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const labelClass = "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/customers" className="admin-text-link font-medium">
          Pelanggan
        </Link>
        <ChevronRight size={12} className="shrink-0 opacity-60" />
        <span className="font-semibold text-foreground">{profile.full_name ?? "Detail Pelanggan"}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Pengguna</p>
          <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">
            {profile.full_name ?? (
              <span className="italic text-muted-foreground">Belum diisi</span>
            )}
          </h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
            Bergabung {formatDate(profile.created_at, { day: "numeric", month: "long", year: "numeric" })}
            {lastSignIn ? ` · Login terakhir ${formatRelativeDate(lastSignIn)}` : ""}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-[#e0e0e0] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground dark:border-border">
          {profile.role}
        </span>
      </div>

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="flex flex-wrap items-start gap-4 p-6">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted dark:border-border">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name ?? "Avatar"}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-xl font-semibold text-foreground">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {email ? (
              <div className="flex items-center gap-1.5 text-[17px] leading-[1.47] text-muted-foreground">
                <Mail size={13} className="shrink-0" />
                <span>{email}</span>
              </div>
            ) : null}
            {profile.phone ? (
              <div className="flex items-center gap-1.5 text-[17px] leading-[1.47] text-muted-foreground">
                <Phone size={13} className="shrink-0" />
                <span>{profile.phone}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="grid divide-y divide-[#e0e0e0] dark:divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatCard label="Total Order" value={String(totalOrders)} />
          <StatCard label="Order Selesai" value={String(completedOrders)} />
          <StatCard label="Total Belanja" value={formatRupiah(totalSpent, true)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Riwayat Pesanan ({totalOrders})</h2>
            </div>

            {orders && orders.length > 0 ? (
              <div className="divide-y divide-[#e0e0e0] dark:divide-border">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ShoppingBag size={14} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="admin-text-link font-mono text-xs font-semibold"
                        >
                          {order.order_number}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">
                          {formatRelativeDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                          adminOrderStatusBadgeClass(order.status),
                        )}
                      >
                        {ADMIN_ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className="text-xs font-semibold">{formatRupiah(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ShoppingBag size={28} strokeWidth={1} />
                <p className="text-xs font-semibold uppercase tracking-widest">Belum ada pesanan</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Alamat ({addresses?.length ?? 0})</h2>
            </div>

            {addresses && addresses.length > 0 ? (
              <div className="divide-y divide-[#e0e0e0] dark:divide-border">
                {addresses.map((addr) => (
                  <div key={addr.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{addr.recipient}</p>
                      {addr.is_default ? (
                        <span className="shrink-0 rounded-md border border-[#e0e0e0] px-1.5 py-0 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground dark:border-border">
                          Utama
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{addr.phone}</p>
                    <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin size={11} className="mt-0.5 shrink-0" />
                      <span>
                        {addr.full_address}, {addr.district}, {addr.city}, {addr.province} {addr.postal_code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">Belum ada alamat tersimpan</div>
            )}
          </div>

          <div className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Info Akun</h2>
            </div>
            <div className="space-y-2 px-4 py-4 text-xs">
              <div className="flex justify-between gap-2">
                <span className={labelClass}>User ID</span>
                <span className="break-all text-right font-mono text-[10px]">{profile.id}</span>
              </div>
              {email ? (
                <div className="flex justify-between gap-2">
                  <span className={labelClass}>Email</span>
                  <span className="text-right">{email}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <span className={labelClass}>Role</span>
                <span className="font-semibold uppercase">{profile.role}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className={labelClass}>Bergabung</span>
                <span>{formatDate(profile.created_at)}</span>
              </div>
              {lastSignIn ? (
                <div className="flex justify-between gap-2">
                  <span className={labelClass}>Login Terakhir</span>
                  <span>{formatRelativeDate(lastSignIn)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
