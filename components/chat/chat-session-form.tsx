"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeaderDropdownPanelBody,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import { useChatStore } from "@/store/chat-store";

type Props = {
  onCreated: (sessionId: string) => void;
};

export function ChatSessionForm({ onCreated }: Props) {
  const productContext = useChatStore((s) => s.productContext);
  const [subject, setSubject] = useState(
    productContext ? `Pertanyaan produk: ${productContext.name}` : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3) {
      setError("Topik minimal 3 karakter");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Gagal membuat sesi");
        return;
      }
      onCreated(json.data.id);
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <HeaderDropdownPanelHeader title="Chat dengan Admin" />
      <HeaderDropdownPanelBody className="flex flex-col gap-4 p-5">
        {productContext && (
          <div className="flex items-center gap-2 rounded-xl border border-[#e0e0e0] bg-[#f5f5f7] p-2.5">
            {productContext.imageUrl && (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white">
                <Image
                  src={productContext.imageUrl}
                  alt={productContext.name}
                  fill
                  className="object-contain p-0.5"
                  sizes="40px"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#1d1d1f]">{productContext.name}</p>
              <p className="truncate text-[10px] text-[#7a7a7a]">/products/{productContext.slug}</p>
            </div>
          </div>
        )}

        <p className="text-[14px] leading-[1.43] text-[#7a7a7a]">
          Ceritakan topik yang ingin kamu tanyakan. Admin kami akan segera membalas.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Topik (misal: pertanyaan produk, status pesanan...)"
            maxLength={200}
            disabled={loading}
            autoFocus
            className="h-11 border-[#e0e0e0] text-[15px]"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={loading || subject.trim().length < 3}
            className="w-full"
          >
            {loading ? "Memulai..." : "Mulai Chat"}
          </Button>
        </form>
      </HeaderDropdownPanelBody>
    </div>
  );
}
