"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendComplaintMessageAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import type { ComplaintMessage } from "@/lib/data/complaints";

export function ComplaintThread({
  complaintId,
  messages,
  currentUserId,
}: {
  complaintId: string;
  messages: ComplaintMessage[];
  currentUserId: string;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await sendComplaintMessageAction(complaintId, text);
      if (res.success) {
        setText("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-[13px] text-[#a0a0a0]">Belum ada pesan.</p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_role === "user";
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  isMe
                    ? "bg-[#EA5329] text-white rounded-br-sm"
                    : "bg-[#f0f0f0] text-[#1d1d1f] rounded-bl-sm"
                }`}
              >
                {!isMe && (
                  <p className="mb-1 text-[10px] font-semibold uppercase text-[#7a7a7a]">Tim GeekyTech</p>
                )}
                <p>{m.message}</p>
                <p className={`mt-1 text-[10px] ${isMe ? "text-white/60" : "text-[#a0a0a0]"}`}>
                  {formatDate(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan..."
          rows={2}
          className="resize-none border-[#e0e0e0] text-[14px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <Button
          type="button"
          variant="primary"
          size="icon"
          onClick={send}
          loading={pending}
          className="self-end h-10 w-10 shrink-0"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
