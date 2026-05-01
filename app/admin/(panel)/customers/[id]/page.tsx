import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detail Pelanggan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Menunggu Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-700",
};

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const [supabase, serviceSupabase] = await Promise.all([
    createClient(),
    createServiceClient(),
  ]);

  const [
    { data: profile },
    { data: authUser },
    { data: orders },
    { data: addresses },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single(),
    serviceSupabase.auth.admin.getUserById(id),
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, recipient_name")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", id)
      .order("is_default", { ascending: false }),
  ]);

  if (!profile) notFound();

  const email = authUser?.user?.email ?? null;
  const lastSignIn = authUser?.user?.last_sign_in_at ?? null;

  const totalOrders = orders?.length ?? 0;
  const totalSpent = orders?.reduce((sum, o) => sum + o.total, 0) ?? 0;
  const completedOrders = orders?.filter((o) =>
    ["completed", "delivered"].includes(o.status)
  ).length ?? 0;

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/customers" className="font-medium transition-colors hover:text-foreground">
          Pelanggan
        </Link>
        <ChevronRight size={12} />
        <span className="font-bold text-foreground">
          {profile.full_name ?? "Detail Pelanggan"}
        </span>
      </nav>

      {/* Profile header */}
      <div className="flex flex-wrap items-start gap-4 border border-border p-5">
        {/* Avatar */}
        <div className="h-16 w-16 shrink-0 overflow-hidden border border-border bg-muted">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name ?? "Avatar"}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-foreground text-xl font-black text-background">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-1">
          <h1 className="text-xl font-black uppercase tracking-tight">
            {profile.full_name ?? <span className="italic text-muted-foreground font-normal text-base">Belum diisi</span>}
          </h1>
          {email && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail size={13} />
              <span>{email}</span>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone size={13} />
              <span>{profile.phone}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            <span className="text-xs text-muted-foreground">
              Bergabung {formatDate(profile.created_at, { day: "numeric", month: "long", year: "numeric" })}
            </span>
            {lastSignIn && (
              <span className="text-xs text-muted-foreground">
                · Login terakhir {formatRelativeDate(lastSignIn)}
              </span>
            )}
          </div>
        </div>

        {/* Role badge */}
        <span className="shrink-0 border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {profile.role}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-border border border-border">
        <StatCard label="Total Order" value={String(totalOrders)} />
        <StatCard label="Order Selesai" value={String(completedOrders)} />
        <StatCard label="Total Belanja" value={formatRupiah(totalSpent, true)} />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Order history */}
        <div className="lg:col-span-2">
          <section className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">
                Riwayat Pesanan ({totalOrders})
              </h2>
            </div>

            {orders && orders.length > 0 ? (
              <div className="divide-y divide-border">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ShoppingBag size={14} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-xs font-bold hover:text-brand transition-colors"
                        >
                          {order.order_number}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">
                          {formatRelativeDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                          ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"
                        )}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      <span className="text-xs font-bold">{formatRupiah(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ShoppingBag size={28} strokeWidth={1} />
                <p className="text-xs font-bold uppercase tracking-widest">Belum ada pesanan</p>
              </div>
            )}
          </section>
        </div>

        {/* Right: Addresses */}
        <div className="space-y-4">
          <section className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">
                Alamat ({addresses?.length ?? 0})
              </h2>
            </div>

            {addresses && addresses.length > 0 ? (
              <div className="divide-y divide-border">
                {addresses.map((addr) => (
                  <div key={addr.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{addr.recipient}</p>
                      {addr.is_default && (
                        <span className="shrink-0 border border-border px-1.5 py-0 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{addr.phone}</p>
                    <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin size={11} className="mt-0.5 shrink-0" />
                      <span>
                        {addr.full_address}, {addr.district}, {addr.city},{" "}
                        {addr.province} {addr.postal_code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                Belum ada alamat tersimpan
              </div>
            )}
          </section>

          {/* Auth info */}
          <section className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Info Akun</h2>
            </div>
            <div className="space-y-2 px-4 py-4 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-[10px] text-right break-all">{profile.id}</span>
              </div>
              {email && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-right">{email}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Role</span>
                <span className="font-semibold uppercase">{profile.role}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Bergabung</span>
                <span>{formatDate(profile.created_at)}</span>
              </div>
              {lastSignIn && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Login Terakhir</span>
                  <span>{formatRelativeDate(lastSignIn)}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-lg font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
