import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { paymentStatusLabel } from "@/lib/constants/payment-status-labels";
import { formatDate, formatRupiah } from "@/lib/format";

export default async function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/invoice`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const { order, payments, items } = detail;
  const paid = payments.find((p) => p.status === "paid");
  const pdfLinks = payments.filter((p) => p.pdf_url);

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-[#1d1d1f]">Invoice &amp; bukti bayar</h2>
      <p className="mt-1 text-sm text-[#5c5c5c]">Unduh PDF instruksi atau bukti dari gateway pembayaran bila tersedia.</p>

      <div className="mt-6 space-y-3 text-sm">
        <p>
          <span className="text-[#7a7a7a]">Nomor pesanan:</span>{" "}
          <span className="font-mono font-bold">{order.order_number}</span>
        </p>
        {paid?.paid_at ? (
          <p>
            <span className="text-[#7a7a7a]">Dibayar:</span> {formatDate(paid.paid_at, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : null}
        <p>
          <span className="text-[#7a7a7a]">Total:</span> <span className="font-bold tabular-nums">{formatRupiah(order.total)}</span>
        </p>
      </div>

      {pdfLinks.length > 0 ? (
        <ul className="mt-8 space-y-2">
          {pdfLinks.map((p) => (
            <li key={p.id}>
              <a href={p.pdf_url!} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#EA5329] underline">
                Unduh PDF ({paymentStatusLabel(p.status)})
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-[#5c5c5c]">Belum ada file PDF dari Midtrans untuk transaksi ini.</p>
      )}

      <div className="mt-10 border-t border-[#e0e0e0] pt-8">
        <h3 className="text-sm font-bold uppercase text-[#7a7a7a]">Ringkasan item</h3>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-4">
              <span className="text-[#1d1d1f]">
                {it.product_name} × {it.quantity}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatRupiah(it.subtotal)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-xs text-[#7a7a7a]">
        Butuh invoice resmi perusahaan?{" "}
        <Link href="/contact" className="font-semibold text-[#EA5329] underline">
          Hubungi kami
        </Link>
        .
      </p>
    </div>
  );
}
