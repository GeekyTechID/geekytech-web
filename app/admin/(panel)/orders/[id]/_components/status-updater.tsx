"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ADMIN_ORDER_STATUS_LABEL, adminOrderStatusBadgeClass } from "@/lib/admin/order-status-ui";
import { updateOrderStatus } from "../../_actions";
import { allowedNextStatuses, type OrderStatus } from "../../_constants";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

interface StatusUpdaterProps {
  orderId: string;
  currentStatus: OrderStatus;
  hasPaidPayment: boolean;
}

export function StatusUpdater({ orderId, currentStatus, hasPaidPayment }: StatusUpdaterProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [isPending, startTransition] = useTransition();
  const isRefund = selectedStatus === "refunded";

  const validNext = allowedNextStatuses(currentStatus, hasPaidPayment);
  const canUpdate = validNext.length > 0;

  const handleSubmit = () => {
    if (!selectedStatus) return;
    if (isRefund && !proofFile) {
      toast.error("Upload bukti transfer refund terlebih dahulu.");
      return;
    }
    startTransition(async () => {
      let refund: { proofPath: string; reference?: string } | undefined;
      if (isRefund && proofFile) {
        try {
          const fd = new FormData();
          fd.append("orderId", orderId);
          fd.append("file", proofFile);
          const res = await fetch("/api/admin/refund-proof", { method: "POST", body: fd });
          const json = (await res.json()) as { success: boolean; data?: { path: string }; error?: string };
          if (!json.success || !json.data) {
            toast.error(json.error ?? "Upload bukti transfer gagal.");
            return;
          }
          refund = { proofPath: json.data.path, reference };
        } catch {
          toast.error("Upload bukti transfer gagal. Periksa koneksi lalu coba lagi.");
          return;
        }
      }

      const result = await updateOrderStatus(orderId, selectedStatus, note, refund);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Status diperbarui ke "${ADMIN_ORDER_STATUS_LABEL[selectedStatus]}".`);
        setOpen(false);
        setSelectedStatus("");
        setNote("");
        setProofFile(null);
        setReference("");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Status saat ini:</span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
            adminOrderStatusBadgeClass(currentStatus),
          )}
        >
          {ADMIN_ORDER_STATUS_LABEL[currentStatus]}
        </span>
      </div>

      {canUpdate ? (
        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setOpen(true)}>
          Ubah Status
        </Button>
      ) : (
        <p className="text-[11px] text-muted-foreground">Status ini tidak dapat diubah secara manual.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase">
              Ubah Status Pesanan
            </DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Pilih status baru. Perubahan akan dicatat di riwayat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className={labelClass}>Status Baru</Label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                className="h-10 w-full rounded-lg border border-[#e0e0e0] bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">— Pilih status —</option>
                {validNext.map((s) => (
                  <option key={s} value={s}>
                    {ADMIN_ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            {isRefund && (
              <div className="space-y-3 rounded-lg border border-[#e0e0e0] bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">
                  Transfer dana ke rekening pembeli dulu, lalu lampirkan buktinya. Bukti bisa dilihat pembeli dan
                  ikut disebut di email refund.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="refund-proof" className={labelClass}>
                    Bukti Transfer (wajib)
                  </Label>
                  <Input
                    id="refund-proof"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    className="h-10 rounded-lg border-[#e0e0e0] text-sm file:mr-3 file:text-xs file:font-semibold"
                  />
                  <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, atau PDF. Maks 5 MB.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="refund-reference" className={labelClass}>
                    No. Referensi Transfer (opsional)
                  </Label>
                  <Input
                    id="refund-reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={100}
                    placeholder="Contoh: 2610071234567"
                    className="h-10 rounded-lg border-[#e0e0e0] text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={labelClass}>Catatan (opsional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Alasan perubahan status..."
                className="h-20 resize-none rounded-lg border-[#e0e0e0] text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleSubmit}
                loading={isPending}
                disabled={!selectedStatus || (isRefund && !proofFile)}
              >
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
