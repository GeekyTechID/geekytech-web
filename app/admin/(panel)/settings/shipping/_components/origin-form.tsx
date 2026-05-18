"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";
const saveClass =
  "h-10 rounded-full bg-brand px-6 text-xs font-semibold uppercase text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50";

type StoreOrigin = {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
  address: string;
};

interface OriginFormProps {
  initialValue: StoreOrigin;
}

export function OriginForm({ initialValue }: OriginFormProps) {
  const [form, setForm] = useState<StoreOrigin>(initialValue);
  const [isPending, startTransition] = useTransition();

  const set = (field: keyof StoreOrigin) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveSetting("store_origin", form);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Alamat origin toko diperbarui.");
    });
  };

  const inputClass = "h-10 rounded-lg border-[#e0e0e0] text-sm dark:border-border";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Nama Toko / Pengirim</label>
          <Input value={form.name} onChange={set("name")} placeholder="GeekyTech Store" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Nomor Telepon</label>
          <Input value={form.phone} onChange={set("phone")} placeholder="6281234567890" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Provinsi</label>
          <Input value={form.province} onChange={set("province")} placeholder="DKI Jakarta" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Kota / Kabupaten</label>
          <Input value={form.city} onChange={set("city")} placeholder="Jakarta Selatan" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Kecamatan</label>
          <Input value={form.district} onChange={set("district")} placeholder="Kebayoran Baru" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Kode Pos</label>
          <Input value={form.postal_code} onChange={set("postal_code")} placeholder="12180" className={inputClass} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelClass}>Alamat Lengkap</label>
          <Input value={form.address} onChange={set("address")} placeholder="Jl. Raya No. 1" className={inputClass} />
        </div>
      </div>
      <button type="button" onClick={handleSave} disabled={isPending} className={saveClass}>
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
