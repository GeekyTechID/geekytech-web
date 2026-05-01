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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  updateOrderStatus,
  VALID_TRANSITIONS,
  type OrderStatus,
} from "../../_actions";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

interface StatusUpdaterProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function StatusUpdater({ orderId, currentStatus }: StatusUpdaterProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const validNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const canUpdate = validNext.length > 0;

  const handleSubmit = () => {
    if (!selectedStatus) return;
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, selectedStatus, note);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Status diperbarui ke "${STATUS_LABELS[selectedStatus]}".`);
        setOpen(false);
        setSelectedStatus("");
        setNote("");
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Current status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Status saat ini:</span>
        <span
          className={cn(
            "px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
            STATUS_COLORS[currentStatus]
          )}
        >
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>

      {canUpdate ? (
        <Button
          variant="outline"
          className="w-full rounded-none font-bold uppercase tracking-widest text-xs"
          onClick={() => setOpen(true)}
        >
          Ubah Status
        </Button>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Status ini tidak dapat diubah secara manual.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Ubah Status Pesanan
            </DialogTitle>
            <DialogDescription>
              Pilih status baru. Perubahan akan dicatat di riwayat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Status select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Status Baru
              </Label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                className="h-9 w-full rounded-none border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                <option value="">— Pilih status —</option>
                {validNext.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">
                Catatan (opsional)
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Alasan perubahan status..."
                className="h-20 resize-none rounded-none text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-none font-bold uppercase tracking-widest text-xs"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                className="flex-1 rounded-none border-0 bg-[#EA5329] font-bold uppercase tracking-widest text-xs text-white hover:bg-[#D44820]"
                onClick={handleSubmit}
                disabled={!selectedStatus || isPending}
              >
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
