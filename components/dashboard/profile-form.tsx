"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
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
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setAvatarUrl(data.url);
        toast.success("Foto berhasil diunggah.");
      } else {
        toast.error(data.error ?? "Gagal mengunggah foto.");
      }
    } catch {
      toast.error("Gagal mengunggah foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
            avatar_url: avatarUrl,
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
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#e0e0e0] bg-[#f5f5f7] transition hover:border-[#EA5329] disabled:cursor-not-allowed"
          aria-label="Ganti foto profil"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Foto profil" fill className="object-cover" sizes="96px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#1d1d1f]">
              {initials}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            {uploading ? (
              <Loader2 size={20} className="animate-spin text-white" />
            ) : (
              <Camera size={20} className="text-white" />
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-medium text-[#EA5329] hover:underline disabled:opacity-50"
        >
          {uploading ? "Mengunggah..." : "Ganti Foto"}
        </button>
        <p className="text-[11px] text-[#7a7a7a]">JPG, PNG, WebP, atau GIF · Maks. 2MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} className="mt-1 border-[#e0e0e0]" />
      </div>
      <div>
        <Label htmlFor="phone">Nomor telepon</Label>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} className="mt-1 border-[#e0e0e0]" />
      </div>

      <Button type="submit" disabled={pending || uploading} className="bg-black text-white hover:bg-[#333]">
        {pending ? <Loader2 size={14} className="animate-spin" /> : "Simpan"}
      </Button>
    </form>
  );
}
