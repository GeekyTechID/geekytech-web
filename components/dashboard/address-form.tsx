"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createAddressAction, updateAddressAction } from "@/app/(dashboard)/dashboard/addresses/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/types/supabase";

type AddressRow = Database["public"]["Tables"]["addresses"]["Row"];

export function AddressForm({ mode, initial }: { mode: "create" | "edit"; initial?: AddressRow | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto max-w-xl space-y-4 rounded-xl border border-[#e0e0e0] bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = {
          label: String(fd.get("label") ?? ""),
          recipient: String(fd.get("recipient") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          province: String(fd.get("province") ?? ""),
          city: String(fd.get("city") ?? ""),
          district: String(fd.get("district") ?? ""),
          postal_code: String(fd.get("postal_code") ?? ""),
          full_address: String(fd.get("full_address") ?? ""),
          is_default: fd.get("is_default") != null,
        };
        startTransition(async () => {
          const res =
            mode === "create"
              ? await createAddressAction(payload)
              : await updateAddressAction({ ...payload, id: initial!.id });
          if (res.success) {
            toast.success(mode === "create" ? "Alamat ditambahkan." : "Alamat diperbarui.");
            router.push("/dashboard/addresses");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="label">Label (opsional)</Label>
          <Input id="label" name="label" placeholder="Rumah / Kantor" defaultValue={initial?.label ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
        <div>
          <Label htmlFor="recipient">Penerima</Label>
          <Input id="recipient" name="recipient" required defaultValue={initial?.recipient ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
        <div>
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" name="phone" required defaultValue={initial?.phone ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
        <div>
          <Label htmlFor="province">Provinsi</Label>
          <Input id="province" name="province" required defaultValue={initial?.province ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
        <div>
          <Label htmlFor="city">Kota / Kabupaten</Label>
          <Input id="city" name="city" required defaultValue={initial?.city ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
        <div>
          <Label htmlFor="district">Kecamatan</Label>
          <Input id="district" name="district" required defaultValue={initial?.district ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
        <div>
          <Label htmlFor="postal_code">Kode pos</Label>
          <Input id="postal_code" name="postal_code" required defaultValue={initial?.postal_code ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="full_address">Alamat lengkap</Label>
          <Input id="full_address" name="full_address" required defaultValue={initial?.full_address ?? ""} className="mt-1 border-[#e0e0e0]" />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="is_default"
          name="is_default"
          defaultChecked={initial?.is_default ?? false}
          className="h-4 w-4 rounded border border-[#e0e0e0] accent-black"
        />
        <Label htmlFor="is_default" className="text-sm font-normal">
          Jadikan alamat utama
        </Label>
      </div>
      <Button type="submit" disabled={pending} className="mt-4 bg-black text-white hover:bg-[#333]">
        {mode === "create" ? "Simpan alamat" : "Perbarui alamat"}
      </Button>
    </form>
  );
}
