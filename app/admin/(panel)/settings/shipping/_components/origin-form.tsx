"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../../_actions";

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Nama Toko / Pengirim
          </label>
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="GeekyTech Store"
            className="h-9 rounded-none text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Nomor Telepon
          </label>
          <Input
            value={form.phone}
            onChange={set("phone")}
            placeholder="6281234567890"
            className="h-9 rounded-none text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Provinsi
          </label>
          <Input
            value={form.province}
            onChange={set("province")}
            placeholder="DKI Jakarta"
            className="h-9 rounded-none text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Kota / Kabupaten
          </label>
          <Input
            value={form.city}
            onChange={set("city")}
            placeholder="Jakarta Selatan"
            className="h-9 rounded-none text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Kecamatan
          </label>
          <Input
            value={form.district}
            onChange={set("district")}
            placeholder="Kebayoran Baru"
            className="h-9 rounded-none text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Kode Pos
          </label>
          <Input
            value={form.postal_code}
            onChange={set("postal_code")}
            placeholder="12180"
            className="h-9 rounded-none text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Alamat Lengkap
          </label>
          <Input
            value={form.address}
            onChange={set("address")}
            placeholder="Jl. Raya No. 1"
            className="h-9 rounded-none text-sm"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="h-10 px-6 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
      >
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
