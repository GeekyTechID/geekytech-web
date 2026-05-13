"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/(dashboard)/dashboard/profile/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto w-full max-w-lg space-y-5 rounded-xl border border-[#e0e0e0] bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await updateProfileAction({
            full_name: String(fd.get("full_name") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            avatar_url: String(fd.get("avatar_url") ?? ""),
          });
          if (res.success) {
            toast.success("Profil diperbarui.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <div>
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} className="mt-1 border-[#e0e0e0]" />
      </div>
      <div>
        <Label htmlFor="phone">Nomor telepon</Label>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} className="mt-1 border-[#e0e0e0]" />
      </div>
      <div>
        <Label htmlFor="avatar_url">URL foto profil</Label>
        <Input id="avatar_url" name="avatar_url" placeholder="https://..." defaultValue={profile.avatar_url ?? ""} className="mt-1 border-[#e0e0e0]" />
        <p className="mt-1 text-xs text-[#7a7a7a]">Tempel URL gambar publik (mis. dari hosting gambar Anda).</p>
      </div>
      <Button type="submit" disabled={pending} className="bg-black text-white hover:bg-[#333]">
        Simpan
      </Button>
    </form>
  );
}
