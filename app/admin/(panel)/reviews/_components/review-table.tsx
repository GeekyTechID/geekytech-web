"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";

import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminTableDeleteButton } from "@/components/admin/admin-table-row-actions";
import { Button } from "@/components/ui/button";
import { deleteReview } from "../_actions";

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  deleted_at: string | null;
  created_at: string;
  product_id: string;
  products: { name: string; slug: string } | null;
  profiles: { full_name: string | null } | null;
};

interface ReviewTableProps {
  reviews: ReviewRow[];
  page: number;
  totalPages: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={cn(
            i < rating ? "fill-brand/80 text-brand" : "text-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function ReviewDeleteAction({ review }: { review: ReviewRow }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Hapus ulasan ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const { error } = await deleteReview(review.id);
      if (error) toast.error(error);
      else toast.success("Ulasan dihapus.");
    });
  };

  return (
    <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
      Hapus
    </AdminTableDeleteButton>
  );
}

export function ReviewTable({ reviews, page, totalPages }: ReviewTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (reviews.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <MessageSquare size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada ulasan</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                  Produk
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                  Rating
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground md:table-cell">
                  Komentar
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground sm:table-cell">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {reviews.map((review) => (
                <tr key={review.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{review.profiles?.full_name ?? "—"}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="line-clamp-1 text-xs text-foreground">
                      {review.products?.name ?? "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <StarRating rating={review.rating} />
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="line-clamp-2 max-w-xs text-xs text-foreground">
                      {review.comment ?? <span className="italic">Tidak ada komentar</span>}
                    </p>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-foreground">
                      {formatRelativeDate(review.created_at)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <ReviewDeleteAction review={review} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
