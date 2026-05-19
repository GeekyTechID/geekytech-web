"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitProductReviewAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardOrderItemRow } from "@/lib/data/dashboard-user";

export function OrderReviewForms({
  orderId,
  items,
  reviewedProductIds,
}: {
  orderId: string;
  items: DashboardOrderItemRow[];
  reviewedProductIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const reviewable = items.filter((it) => it.product_id && !reviewedProductIds.includes(it.product_id));

  if (reviewable.length === 0) {
    return <p className="text-sm text-[#5c5c5c]">Semua produk pada pesanan ini sudah memiliki ulasan dari Anda, atau tidak terhubung ke katalog untuk ulasan.</p>;
  }

  return (
    <div className="space-y-10">
      {reviewable.map((it) => (
        <form
          key={it.id}
          className="rounded-xl border border-[#e0e0e0] bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const rating = Number(fd.get("rating"));
            const comment = String(fd.get("comment") ?? "");
            startTransition(async () => {
              const res = await submitProductReviewAction({
                orderId,
                productId: it.product_id!,
                rating,
                comment: comment.trim() || null,
              });
              if (res.success) {
                toast.success("Ulasan terkirim — menunggu moderasi.");
                router.refresh();
              } else {
                toast.error(res.error);
              }
            });
          }}
        >
          <input type="hidden" name="productId" value={it.product_id!} />
          <p className="font-semibold text-[#1d1d1f]">{it.product_name}</p>
          <p className="text-xs text-[#7a7a7a]">{it.variant_name}</p>
          <div className="mt-4">
            <Label htmlFor={`rating-${it.id}`} className="text-xs font-semibold uppercase text-[#7a7a7a]">
              Rating
            </Label>
            <select
              id={`rating-${it.id}`}
              name="rating"
              required
              className="mt-1 h-10 w-full max-w-xs rounded-lg border border-[#e0e0e0] bg-white px-3 text-sm"
              defaultValue={5}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} bintang
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <Label htmlFor={`comment-${it.id}`} className="text-xs font-semibold uppercase text-[#7a7a7a]">
              Komentar (opsional)
            </Label>
            <Textarea id={`comment-${it.id}`} name="comment" rows={4} className="mt-1 border-[#e0e0e0]" placeholder="Ceritakan pengalamanmu dengan produk ini." />
          </div>
          <Button type="submit" variant="primary" disabled={pending} className="mt-4">
            Kirim ulasan
          </Button>
        </form>
      ))}
    </div>
  );
}
