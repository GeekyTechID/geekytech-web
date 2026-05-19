"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateComplaintStatus, updateAdminNote, type ComplaintStatus } from "../../_actions";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Baru",
    className: "bg-brand/10 text-brand",
  },
  in_review: {
    label: "Ditinjau",
    className: "bg-muted text-foreground",
  },
  resolved: {
    label: "Selesai",
    className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-muted text-muted-foreground",
  },
};

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

export type ComplaintDetail = {
  id: string;
  type: string;
  reason: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  images: string[];
  created_at: string;
  resolved_at: string | null;
  orders: { id: string; order_number: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

interface ComplaintDetailProps {
  complaint: ComplaintDetail;
}

export function ComplaintDetailView({ complaint }: ComplaintDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [adminNote, setAdminNote] = useState(complaint.admin_note ?? "");
  const statusCfg = STATUS_CONFIG[complaint.status] ?? { label: complaint.status, className: "bg-muted text-muted-foreground" };

  const handleStatusUpdate = (newStatus: ComplaintStatus) => {
    startTransition(async () => {
      const { error } = await updateComplaintStatus(complaint.id, newStatus, adminNote);
      if (error) toast.error(error);
      else toast.success(`Status diubah ke "${STATUS_CONFIG[newStatus]?.label ?? newStatus}".`);
    });
  };

  const handleSaveNote = () => {
    startTransition(async () => {
      const { error } = await updateAdminNote(complaint.id, adminNote);
      if (error) toast.error(error);
      else toast.success("Catatan admin disimpan.");
    });
  };

  const images = Array.isArray(complaint.images) ? complaint.images : [];

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <Link
        href="/admin/complaints"
        className="admin-text-link inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={13} />
        Kembali ke daftar komplain
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Layanan</p>
          <h1 className="text-[34px] font-semibold uppercase text-foreground">Detail Komplain</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
            Dibuat {formatDate(complaint.created_at)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase",
            statusCfg.className,
          )}
        >
          {statusCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Informasi Komplain</h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4 text-[17px] leading-[1.47]">
                <div>
                  <p className={cn(labelClass, "mb-1")}>Tipe</p>
                  <p className="capitalize">{complaint.type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className={cn(labelClass, "mb-1")}>No. Order</p>
                  {complaint.orders ? (
                    <Link
                      href={`/admin/orders/${complaint.orders.id}`}
                      className="admin-text-link inline-flex items-center gap-1 font-mono text-sm font-semibold"
                    >
                      {complaint.orders.order_number}
                      <ExternalLink size={11} />
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>

              <div>
                <p className={cn(labelClass, "mb-1")}>Alasan</p>
                <p className="text-[17px] leading-[1.47]">{complaint.reason}</p>
              </div>

              {complaint.description && (
                <div>
                  <p className={cn(labelClass, "mb-1")}>Deskripsi</p>
                  <p className="whitespace-pre-wrap text-[17px] leading-[1.47] text-muted-foreground">
                    {complaint.description}
                  </p>
                </div>
              )}

              {images.length > 0 && (
                <div>
                  <p className={cn(labelClass, "mb-2")}>Foto Bukti ({images.length})</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted/30 transition-opacity hover:opacity-80 dark:border-border"
                      >
                        <Image src={url} alt={`Bukti ${i + 1}`} fill sizes="120px" className="object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Catatan Admin</h2>
            </div>
            <div className="space-y-3 p-6">
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Tambahkan catatan internal untuk komplain ini..."
                rows={4}
                className="w-full resize-none rounded-lg border border-[#e0e0e0] bg-background px-3 py-2 text-[17px] leading-[1.47] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-border"
              />
              <Button type="button" variant="primary" size="sm" onClick={handleSaveNote} disabled={isPending}>
                Simpan Catatan
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Pelanggan</h2>
            </div>
            <div className="space-y-3 p-6 text-[17px] leading-[1.47]">
              <div>
                <p className={cn(labelClass, "mb-0.5")}>Nama</p>
                <p className="font-medium">{complaint.profiles?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className={cn(labelClass, "mb-0.5")}>No. Telepon</p>
                <p>{complaint.profiles?.phone ?? "—"}</p>
              </div>
              {complaint.resolved_at && (
                <div>
                  <p className={cn(labelClass, "mb-0.5")}>Diselesaikan</p>
                  <p>{formatDate(complaint.resolved_at)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Tindakan</h2>
            </div>
            <div className="space-y-2 p-6">
              {complaint.status === "open" && (
                <Button
                  type="button"
                  variant="pearl"
                  size="sm"
                  className="w-full"
                  onClick={() => handleStatusUpdate("in_review")}
                  disabled={isPending}
                >
                  <Clock size={14} />
                  Mulai Tinjau
                </Button>
              )}

              {(complaint.status === "open" || complaint.status === "in_review") && (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleStatusUpdate("resolved")}
                    disabled={isPending}
                  >
                    <CheckCircle2 size={14} />
                    Tandai Selesai
                  </Button>
                  <Button
                    type="button"
                    variant="destructive-ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={isPending}
                  >
                    <XCircle size={14} />
                    Tolak Komplain
                  </Button>
                </>
              )}

              {(complaint.status === "resolved" || complaint.status === "rejected") && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleStatusUpdate("open")}
                  disabled={isPending}
                >
                  Buka Kembali
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
