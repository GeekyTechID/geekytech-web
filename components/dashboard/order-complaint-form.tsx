"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitComplaintAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OrderComplaintForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const reason = String(fd.get("reason") ?? "");
        const description = String(fd.get("description") ?? "");
        startTransition(async () => {
          const res = await submitComplaintAction({
            orderId,
            reason,
            description: description.trim() || null,
          });
          if (res.success) {
            toast.success("Komplain diajukan. Tim kami akan meninjau.");
            e.currentTarget.reset();
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <div>
        <Label htmlFor="reason" className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">
          Ringkasan masalah
        </Label>
        <Input id="reason" name="reason" required minLength={3} className="mt-1 border-[#e0e0e0]" placeholder="Contoh: Barang cacat / salah kirim" />
      </div>
      <div className="mt-4">
        <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">
          Detail (opsional)
        </Label>
        <Textarea id="description" name="description" rows={5} className="mt-1 border-[#e0e0e0]" placeholder="Jelaskan kejadian beserta nomor SKU bila perlu." />
      </div>
      <Button type="submit" disabled={pending} className="mt-6 bg-black text-white hover:bg-[#333]">
        Ajukan komplain
      </Button>
    </form>
  );
}
