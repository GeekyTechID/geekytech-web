"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, MessageSquare, Star, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { approveReview, rejectReview, deleteReview } from "../_actions";

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
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
          className={i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function ReviewActions({ review }: { review: ReviewRow }) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const { error } = await approveReview(review.id);
      if (error) toast.error(error);
      else toast.success("Ulasan disetujui.");
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const { error } = await rejectReview(review.id);
      if (error) toast.error(error);
      else toast.success("Ulasan ditolak.");
    });
  };

  const handleDelete = () => {
    if (!confirm("Hapus ulasan ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const { error } = await deleteReview(review.id);
      if (error) toast.error(error);
      else toast.success("Ulasan dihapus.");
    });
  };

  return (
    <div className="flex items-center gap-1">
      {!review.is_approved ? (
        <button
          onClick={handleApprove}
          disabled={isPending}
          title="Setujui ulasan"
          className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={15} />
        </button>
      ) : (
        <button
          onClick={handleReject}
          disabled={isPending}
          title="Tolak ulasan"
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
        >
          <XCircle size={15} />
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Hapus ulasan"
        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        <Trash2 size={15} />
      </button>
    </div>
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
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <MessageSquare size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada ulasan</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pelanggan
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Produk
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Rating
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
                Komentar
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
                Tanggal
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr
                key={review.id}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
              >
                {/* Customer */}
                <td className="px-4 py-3">
                  <span className="text-sm font-medium">
                    {review.profiles?.full_name ?? "—"}
                  </span>
                </td>

                {/* Product */}
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {review.products?.name ?? "—"}
                  </span>
                </td>

                {/* Rating */}
                <td className="px-4 py-3">
                  <StarRating rating={review.rating} />
                </td>

                {/* Comment */}
                <td className="hidden px-4 py-3 md:table-cell">
                  <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
                    {review.comment ?? <span className="italic">Tidak ada komentar</span>}
                  </p>
                </td>

                {/* Date */}
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(review.created_at)}
                  </span>
                </td>

                {/* Status badge */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                      review.is_approved
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    )}
                  >
                    {review.is_approved ? "Disetujui" : "Menunggu"}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <ReviewActions review={review} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
