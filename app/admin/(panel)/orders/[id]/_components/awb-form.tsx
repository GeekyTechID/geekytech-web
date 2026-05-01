"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrderAWB } from "../../_actions";

interface AWBFormProps {
  orderId: string;
  currentAWB?: string | null;
}

export function AWBForm({ orderId, currentAWB }: AWBFormProps) {
  const [awb, setAwb] = useState(currentAWB ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateOrderAWB(orderId, awb);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Nomor AWB berhasil disimpan.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="awb" className="text-xs font-bold uppercase tracking-widest">
          Nomor Resi (AWB)
        </Label>
        <div className="flex gap-2">
          <Input
            id="awb"
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            placeholder="Masukkan nomor resi..."
            className="h-9 flex-1 rounded-none font-mono text-sm"
          />
          <Button
            type="submit"
            className="h-9 shrink-0 rounded-none border-0 bg-foreground font-bold uppercase tracking-widest text-xs text-background hover:bg-foreground/80"
            disabled={isPending || !awb.trim()}
          >
            {isPending ? "..." : "Simpan"}
          </Button>
        </div>
      </div>

      {currentAWB && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Package size={11} />
          <span>Resi aktif: <span className="font-mono font-semibold text-foreground">{currentAWB}</span></span>
        </div>
      )}
    </form>
  );
}
