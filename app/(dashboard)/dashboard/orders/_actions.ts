"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { syncProductRating } from "@/lib/products/sync-product-rating";

import { buildWhatsAppUrl } from "@/lib/whatsapp-link";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
import { cancelMidtransTransaction } from "@/lib/midtrans/cancel-transaction";
import { refundMidtransTransaction } from "@/lib/midtrans/refund-transaction";
import { refundDurationText } from "@/lib/midtrans/refund-duration";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export type OrderActionResult = { success: true } | { success: false; error: string };

type BankInfo = {
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
};

export async function cancelOrderAction(
  orderId: string,
  bankInfo?: BankInfo,
): Promise<OrderActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { data: row, error: fetchErr } = await supabase
      .from("orders")
      .select("id, status, order_number")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchErr || !row) return { success: false, error: "Pesanan tidak ditemukan." };

    const st = row.status as OrderStatus;
    if (st !== "pending_payment" && st !== "paid") {
      return { success: false, error: "Pesanan ini tidak dapat dibatalkan pada tahap ini." };
    }

    const { error: upErr } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
        ...(bankInfo
          ? {
              refund_bank_name: bankInfo.bank_name,
              refund_account_name: bankInfo.bank_account_name,
              refund_account_number: bankInfo.bank_account_number,
            }
          : {}),
      })
      .eq("id", orderId)
      .eq("user_id", user.id);
    if (upErr) return { success: false, error: upErr.message };

    // Service client diperlukan untuk operasi stok (bypass RLS)
    const svc = createServiceClient();

    // Release stok sesuai status sebelum dibatalkan
    const { data: items } = await svc
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", orderId);

    if (items?.length) {
      const productQtyMap = new Map<string, number>();
      for (const item of items) {
        if (!item.variant_id) continue;
        const { data: v } = await svc
          .from("product_variants")
          .select("stock, reserved, product_id")
          .eq("id", item.variant_id)
          .single();
        if (!v) continue;

        if (st === "pending_payment") {
          // Stok belum dipotong — cukup kurangi reserved
          await svc
            .from("product_variants")
            .update({ reserved: Math.max(0, v.reserved - item.quantity) })
            .eq("id", item.variant_id);
        } else {
          // st === "paid" — stok sudah dipotong saat settlement, kembalikan
          await svc
            .from("product_variants")
            .update({
              stock: v.stock + item.quantity,
              reserved: Math.max(0, v.reserved - item.quantity),
            })
            .eq("id", item.variant_id);
          if (v.product_id) {
            productQtyMap.set(v.product_id, (productQtyMap.get(v.product_id) ?? 0) + item.quantity);
          }
        }

        await svc.from("stock_history").insert({
          variant_id: item.variant_id,
          order_id: orderId,
          quantity: item.quantity,
          type: "return",
          note: `Pesanan ${row.order_number ?? orderId} dibatalkan oleh pelanggan`,
          changed_by: null,
        });
      }

      // Kembalikan total_sold jika stok sudah dipotong
      for (const [productId, qty] of productQtyMap) {
        const { data: p } = await svc
          .from("products")
          .select("total_sold")
          .eq("id", productId)
          .single();
        if (p) {
          await svc
            .from("products")
            .update({ total_sold: Math.max(0, p.total_sold - qty) })
            .eq("id", productId);
        }
      }
    }

    // Simpan rekening bank ke profil user (untuk reuse berikutnya)
    if (bankInfo) {
      const svcForProfile = createServiceClient();
      await svcForProfile
        .from("profiles")
        .update({
          bank_name: bankInfo.bank_name,
          bank_account_name: bankInfo.bank_account_name,
          bank_account_number: bankInfo.bank_account_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // Notifikasi user: pembatalan berhasil
    await createNotification({
      userId: user.id,
      title: "Pesanan Dibatalkan",
      body: `Pesanan ${row.order_number ?? orderId} telah dibatalkan sesuai permintaan Anda.`,
      type: "order_cancelled",
      data: { orderId, orderNumber: row.order_number },
    });

    // Midtrans: cancel/refund best-effort
    if (row.order_number) {
      if (st === "pending_payment") {
        const midtransResult = await cancelMidtransTransaction(row.order_number);
        if (!midtransResult.ok) {
          console.error("[cancelOrderAction] Midtrans cancel failed:", midtransResult.error);
        }
      } else if (st === "paid" || st === "processing") {
        const { data: paymentRow } = await svc
          .from("payments")
          .select("gross_amount, payment_type")
          .eq("midtrans_order_id", row.order_number)
          .maybeSingle();
        const amount = Number(paymentRow?.gross_amount ?? 0);
        const midtransResult = await refundMidtransTransaction(
          row.order_number,
          "Dibatalkan oleh pelanggan",
          amount,
        );
        if (midtransResult.ok) {
          await svc
            .from("payments")
            .update({ status: "refunded" })
            .eq("midtrans_order_id", row.order_number);
          const duration = refundDurationText(paymentRow?.payment_type);
          await createNotification({
            userId: user.id,
            title: "Refund Sedang Diproses",
            body: `Dana Rp${amount.toLocaleString("id-ID")} untuk pesanan ${row.order_number} sedang diproses. Estimasi pengembalian: ${duration}.`,
            type: "payment_refunded",
            data: { orderId, orderNumber: row.order_number },
          });
        } else {
          // VA/bank transfer: refund manual oleh admin — beri notifikasi yang sesuai
          const isVA =
            paymentRow?.payment_type === "bank_transfer" ||
            (paymentRow?.payment_type ?? "").endsWith("_va");
          if (isVA && bankInfo) {
            await createNotification({
              userId: user.id,
              title: "Refund Akan Diproses Admin",
              body: `Dana Rp${amount.toLocaleString("id-ID")} untuk pesanan ${row.order_number} akan dikembalikan ke rekening ${bankInfo.bank_name} atas nama ${bankInfo.bank_account_name} dalam 3–14 hari kerja.`,
              type: "payment_refunded",
              data: { orderId, orderNumber: row.order_number },
            });
          } else {
            console.error("[cancelOrderAction] Midtrans refund failed:", midtransResult.error);
          }
        }
      }
    }

    // Catat di status history
    await svc.from("order_status_history").insert({
      order_id: orderId,
      status: "cancelled",
      note: "Dibatalkan oleh pelanggan",
      changed_by: null,
    });

    // Notifikasi admin
    await createAdminNotification({
      title: "Pesanan Dibatalkan",
      body: `Pesanan ${row.order_number ?? orderId} dibatalkan oleh pelanggan.`,
      type: "order_cancelled",
      data: { orderId, orderNumber: row.order_number },
    });

    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function confirmOrderReceivedAction(orderId: string): Promise<OrderActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { data: row, error: fetchErr } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchErr || !row) return { success: false, error: "Pesanan tidak ditemukan." };

    if (row.status !== "delivered") {
      return { success: false, error: "Konfirmasi hanya untuk pesanan dengan status tiba di tujuan." };
    }

    const { error: upErr } = await supabase
      .from("orders")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("user_id", user.id);
    if (upErr) return { success: false, error: upErr.message };

    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

const reviewSchema = z.object({
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export async function submitProductReviewAction(input: z.infer<typeof reviewSchema>): Promise<OrderActionResult> {
  try {
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Data ulasan tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { orderId, productId, rating, comment } = parsed.data;

    const { data: order } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!order) return { success: false, error: "Pesanan tidak ditemukan." };

    if (order.status !== "delivered" && order.status !== "completed") {
      return { success: false, error: "Ulasan hanya dapat dikirim setelah barang diterima." };
    }

    const { data: existing } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("order_id", orderId)
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return { success: false, error: "Produk ini sudah Anda ulas untuk pesanan ini." };

    const { error: insErr } = await supabase.from("product_reviews").insert({
      order_id: orderId,
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment?.trim() || null,
      is_approved: true,
    });
    if (insErr) return { success: false, error: insErr.message };

    // Safety net for databases that have not yet received the rating trigger.
    // The same calculation is also enforced by migration 028 at database level.
    const ratingSync = await syncProductRating(productId);
    if (!ratingSync.success) {
      console.error("[submitProductReviewAction] Rating summary sync failed:", ratingSync.error);
    }

    // Jika pesanan masih "delivered", tandai selesai setelah user memberi ulasan
    if (order.status === "delivered") {
      await supabase
        .from("orders")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("user_id", user.id);
    }

    await createAdminNotification({
      title: "Ulasan Produk Baru",
      body: `Ulasan bintang ${rating} telah dikirim oleh pelanggan (pesanan ${orderId}).`,
      type: "new_review",
      data: { orderId, productId, rating },
    });

    // Bust ISR cache produk agar ulasan & rating tampil langsung
    const svcForSlug = createServiceClient();
    const { data: productRow } = await svcForSlug
      .from("products")
      .select("slug")
      .eq("id", productId)
      .maybeSingle();
    if (productRow?.slug) {
      revalidatePath(`/products/${productRow.slug}`);
    }
    revalidatePath("/");
    revalidatePath("/products");

    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath(`/dashboard/orders/${orderId}/review`);
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function submitComplaintAction(input: {
  orderId: string;
  category: string;
  reason: string;
  description: string | null;
  mediaUrls: string[];
  type: "product" | "return";
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tidak terautentikasi." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, delivered_at")
    .eq("id", input.orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return { success: false, error: "Pesanan tidak ditemukan." };
  if (order.status === "completed") {
    return {
      success: false,
      error: "Batas waktu komplain (3 hari setelah diterima) telah berakhir.",
    };
  }
  if (order.status !== "delivered") {
    return {
      success: false,
      error: "Komplain hanya bisa diajukan setelah barang diterima.",
    };
  }
  if (order.delivered_at) {
    const deadline = new Date(order.delivered_at).getTime() + 3 * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      return {
        success: false,
        error: "Batas waktu komplain (3 hari setelah diterima) telah berakhir.",
      };
    }
  }

  const { data: existing } = await supabase
    .from("complaints")
    .select("id")
    .eq("order_id", input.orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { success: false, error: "Komplain untuk pesanan ini sudah ada." };

  const VALID_CATEGORIES = [
    "wrong_item",
    "damaged",
    "missing_item",
    "not_as_described",
    "other",
  ];
  if (!VALID_CATEGORIES.includes(input.category)) {
    return { success: false, error: "Kategori tidak valid." };
  }
  if (input.type !== "product" && input.type !== "return") {
    return { success: false, error: "Tipe komplain tidak valid." };
  }

  const { error } = await supabase.from("complaints").insert({
    order_id: input.orderId,
    user_id: user.id,
    type: input.type,
    category: input.category,
    reason: input.reason.trim(),
    description: input.description,
    images: input.mediaUrls,
    status: "open",
  });

  if (error) return { success: false, error: error.message };

  await createAdminNotification({
    title: "Komplain Baru Masuk",
    body: `Komplain baru untuk pesanan ${input.orderId}: "${input.reason}"`,
    type: "new_complaint",
    data: { orderId: input.orderId, reason: input.reason },
  });

  revalidatePath(`/dashboard/orders/${input.orderId}`);
  revalidatePath(`/dashboard/orders/${input.orderId}/complaint`);
  return { success: true };
}

/**
 * Bantuan lanjut bayar: tautan WhatsApp CS dengan konteks nomor order.
 * Integrasi Midtrans snap ulang dapat ditambahkan di route API terpisah.
 */
export async function deleteUnpaidOrderAction(orderId: string): Promise<OrderActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { data: row } = await supabase
      .from("orders")
      .select("id, status, coupon_id")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) return { success: false, error: "Pesanan tidak ditemukan." };
    if (row.status !== "pending_payment") return { success: false, error: "Pesanan tidak dapat dihapus." };

    const svc = createServiceClient();

    // Release stock reservation
    const { data: items } = await svc
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", orderId);
    if (items) {
      for (const item of items) {
        if (!item.variant_id) continue;
        const { data: v } = await svc
          .from("product_variants")
          .select("reserved")
          .eq("id", item.variant_id)
          .single();
        if (v) {
          await svc
            .from("product_variants")
            .update({ reserved: Math.max(0, v.reserved - item.quantity) })
            .eq("id", item.variant_id);
        }
      }
    }

    // Reverse coupon used_count (coupon_usages cascade-deleted with order)
    if (row.coupon_id) {
      const { data: coupon } = await svc
        .from("coupons")
        .select("used_count")
        .eq("id", row.coupon_id)
        .single();
      if (coupon) {
        await svc
          .from("coupons")
          .update({ used_count: Math.max(0, coupon.used_count - 1) })
          .eq("id", row.coupon_id);
      }
    }

    // Delete order — cascades to order_items, payments, coupon_usages,
    // order_status_history, shipments, complaints
    await svc.from("orders").delete().eq("id", orderId);

    revalidatePath("/dashboard/orders");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function getRetryPaymentWhatsAppLink(orderNumber: string): Promise<{ success: true; url: string | null } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const msg = `Halo GeekyTech, saya ingin melanjutkan pembayaran untuk pesanan ${orderNumber}.`;
    return { success: true, url: buildWhatsAppUrl(msg) };
  } catch {
    return { success: false, error: "Terjadi kesalahan." };
  }
}

export async function sendComplaintMessageAction(
  complaintId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tidak terautentikasi." };

  const { data: complaint } = await supabase
    .from("complaints")
    .select("id, order_id")
    .eq("id", complaintId)
    .eq("user_id", user.id)
    .single();
  if (!complaint) return { success: false, error: "Komplain tidak ditemukan." };

  const trimmedMessage = message.trim();
  const { error } = await supabase.from("complaint_messages").insert({
    complaint_id: complaintId,
    sender_id: user.id,
    sender_role: "user",
    message: trimmedMessage,
  });
  if (error) return { success: false, error: error.message };

  await createAdminNotification({
    title: "Balasan Komplain Baru",
    body: `Pelanggan membalas komplain: "${trimmedMessage.slice(0, 100)}"`,
    type: "complaint_reply",
    data: { complaintId, orderId: complaint.order_id },
  });

  revalidatePath(`/dashboard/orders`);
  return { success: true };
}

export async function submitReturnAWBAction(
  returnId: string,
  returnAwb: string,
  returnCourier: string,
  proofImages: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tidak terautentikasi." };

  const { data: ret } = await supabase
    .from("returns")
    .select("id, status, order_id, complaint_id")
    .eq("id", returnId)
    .eq("user_id", user.id)
    .single();

  if (!ret || ret.status !== "pending_shipback") {
    return { success: false, error: "Pengajuan retur tidak ditemukan atau sudah diproses." };
  }

  // Service client: `returns` only has a SELECT RLS policy, so a user-scoped
  // UPDATE silently matches 0 rows (PostgREST returns no error) and the resi
  // would never be saved. Ownership + status are already verified above, so
  // this is the same pattern the admin return actions use.
  const svc = createServiceClient();
  const { data: updated, error } = await svc
    .from("returns")
    .update({
      return_awb: returnAwb.trim(),
      return_courier: returnCourier.trim(),
      proof_images: proofImages,
      status: "shipped_back",
      updated_at: new Date().toISOString(),
    })
    .eq("id", returnId)
    .eq("status", "pending_shipback")
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!updated?.length) {
    return { success: false, error: "Pengajuan retur sudah diproses. Muat ulang halaman." };
  }

  await createAdminNotification({
    title: "Barang Retur Dikirim Pembeli",
    body: `Pembeli mengirim balik barang via ${returnCourier.trim()} — resi ${returnAwb.trim()}.`,
    type: "return_shipped_back",
    data: { returnId, orderId: ret.order_id, complaintId: ret.complaint_id },
  });

  revalidatePath(`/dashboard/orders`);
  return { success: true };
}
