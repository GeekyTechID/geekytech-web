"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReturnAWBAction } from "@/app/(dashboard)/dashboard/orders/_actions";

export function ReturnAwbForm({ returnId }: { returnId: string }) {
  const [courier, setCourier] = useState("");
  const [awb, setAwb] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courier.trim() || !awb.trim()) return;
    startTransition(async () => {
      const res = await submitReturnAWBAction(returnId, awb, courier);
      if (res.success) {
        toast.success("Resi berhasil dikirim. Menunggu konfirmasi dari tim GeekyTech.");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">Nama kurir</Label>
        <Input
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          required
          placeholder="Contoh: JNE, J&T, SiCepat"
          className="mt-1 border-[#e0e0e0]"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">Nomor resi</Label>
        <Input
          value={awb}
          onChange={(e) => setAwb(e.target.value)}
          required
          placeholder="Masukkan nomor resi pengiriman"
          className="mt-1 border-[#e0e0e0]"
        />
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        Konfirmasi Sudah Kirim
      </Button>
    </form>
  );
}
