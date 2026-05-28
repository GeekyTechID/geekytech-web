"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-primary shrink-0" />
        <span className="text-sm font-semibold">Chat dengan Admin</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
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
    </div>
  );
}
