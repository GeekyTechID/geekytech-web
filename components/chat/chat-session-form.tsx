"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeaderDropdownPanelBody,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";

type Props = {
  onCreated: (sessionId: string) => void;
};

export function ChatSessionForm({ onCreated }: Props) {
  const [subject, setSubject] = useState("");
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
