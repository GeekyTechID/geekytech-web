"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { updateComplaintStatus, updateAdminNote, type ComplaintStatus } from "../../_actions";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Baru",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  in_review: {
    label: "Ditinjau",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  resolved: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

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
  const statusCfg = STATUS_CONFIG[complaint.status] ?? { label: complaint.status, className: "" };

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
    <div className="space-y-6 p-6">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/complaints"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar komplain
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Detail Komplain
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Dibuat {formatDate(complaint.created_at)}
            </p>
          </div>
          <span
            className={cn(
              "inline-block px-3 py-1 text-xs font-black uppercase tracking-widest",
              statusCfg.className
            )}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Complaint info */}
          <div className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Informasi Komplain</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Tipe
                  </p>
                  <p className="capitalize">{complaint.type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    No. Order
                  </p>
                  {complaint.orders ? (
                    <Link
                      href={`/admin/orders/${complaint.orders.id}`}
                      className="font-mono font-bold hover:text-brand transition-colors inline-flex items-center gap-1"
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Alasan
                </p>
                <p className="text-sm">{complaint.reason}</p>
              </div>

              {complaint.description && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Deskripsi
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {complaint.description}
                  </p>
                </div>
              )}

              {/* Images */}
              {images.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Foto Bukti ({images.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {images.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square border border-border overflow-hidden bg-muted/30 hover:opacity-80 transition-opacity"
                      >
                        <Image
                          src={url}
                          alt={`Bukti ${i + 1}`}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin note */}
          <div className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Catatan Admin</h2>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Tambahkan catatan internal untuk komplain ini..."
                rows={4}
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
              />
              <button
                onClick={handleSaveNote}
                disabled={isPending}
                className="h-9 px-4 bg-swiss-black text-swiss-white text-xs font-bold uppercase tracking-widest transition-opacity disabled:opacity-50"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>

        {/* Right: customer info + actions */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Pelanggan</h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                  Nama
                </p>
                <p className="font-medium">{complaint.profiles?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                  No. Telepon
                </p>
                <p>{complaint.profiles?.phone ?? "—"}</p>
              </div>
              {complaint.resolved_at && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Diselesaikan
                  </p>
                  <p>{formatDate(complaint.resolved_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Tindakan</h2>
            </div>
            <div className="p-4 space-y-2">
              {complaint.status === "open" && (
                <button
                  onClick={() => handleStatusUpdate("in_review")}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 h-9 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Clock size={14} />
                  Mulai Tinjau
                </button>
              )}

              {(complaint.status === "open" || complaint.status === "in_review") && (
                <>
                  <button
                    onClick={() => handleStatusUpdate("resolved")}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 h-9 bg-green-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    Tandai Selesai
                  </button>
                  <button
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 h-9 bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Tolak Komplain
                  </button>
                </>
              )}

              {(complaint.status === "resolved" || complaint.status === "rejected") && (
                <button
                  onClick={() => handleStatusUpdate("open")}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 h-9 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Buka Kembali
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
