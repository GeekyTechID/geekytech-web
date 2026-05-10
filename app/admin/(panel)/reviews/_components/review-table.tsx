"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";

import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableRowTextButton,
} from "@/components/admin/admin-table-row-actions";
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
          className={cn(
            i < rating ? "fill-brand/80 text-brand" : "text-muted-foreground/30",
          )}
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
    <div className="flex flex-wrap items-center gap-1.5">
      {!review.is_approved ? (
        <AdminTableRowTextButton tone="positive" onClick={handleApprove} disabled={isPending}>
          Setujui
        </AdminTableRowTextButton>
      ) : (
        <AdminTableRowTextButton tone="danger" onClick={handleReject} disabled={isPending}>
          Tolak
        </AdminTableRowTextButton>
      )}
      <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
        Hapus
      </AdminTableDeleteButton>
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
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <MessageSquare size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase tracking-widest">Belum ada ulasan</p>
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
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Produk
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Rating
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                  Komentar
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:table-cell">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {review.products?.name ?? "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <StarRating rating={review.rating} />
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="line-clamp-2 max-w-xs text-xs text-muted-foreground">
                      {review.comment ?? <span className="italic">Tidak ada komentar</span>}
                    </p>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(review.created_at)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                        review.is_approved
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
                          : "bg-brand/10 text-brand",
                      )}
                    >
                      {review.is_approved ? "Disetujui" : "Menunggu"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <ReviewActions review={review} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
