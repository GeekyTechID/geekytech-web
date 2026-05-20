"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CartRemoveConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

/** Konfirmasi hapus item keranjang — selaras design.mdc (utility card, pill CTA, tipografi 17px). */
export function CartRemoveConfirmDialog({
  open,
  onOpenChange,
  productName,
  onConfirm,
  isLoading = false,
}: CartRemoveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white p-0 shadow-none sm:max-w-[400px] dark:border-border dark:bg-card"
      >
        <DialogHeader className="space-y-2 px-6 py-5 text-left dark:border-border">
          <DialogTitle className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#1d1d1f] dark:text-foreground">
            Hapus dari keranjang?
          </DialogTitle>
          <DialogDescription className="text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#7a7a7a] dark:text-muted-foreground">
            <span className="font-medium text-[#1d1d1f] dark:text-foreground">{productName}</span>{" "}
            <span className="text-[#1d1d1f] font-medium dark:text-muted-foreground">akan dihapus dari keranjang Anda.</span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="!flex flex-row justify-end !items-center gap-2 px-6">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto mb-4"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto text-white mb-4"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
