"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CartLineCard, type CartLineView } from "@/components/store/cart-line-card";
import { CartCheckoutStepper } from "@/components/store/cart-checkout-stepper";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MIDTRANS_CHECKOUT_PAYMENT_OPTIONS,
  type MidtransCheckoutPaymentId,
} from "@/lib/constants/midtrans-checkout-payments";

type AddressRow = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  full_address: string;
  district: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
};

type ShippingOption = {
  courierCode: string;
  serviceCode: string;
  courierName: string;
  serviceName: string;
  price: number;
  etd: string;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

type CheckoutPageClientProps = {
  lines: CartLineView[];
  addresses: AddressRow[];
  initialAddressId: string | null;
};

export function CheckoutPageClient({ lines, addresses, initialAddressId }: CheckoutPageClientProps) {
  const router = useRouter();
  const [addressId, setAddressId] = useState<string>(initialAddressId ?? addresses[0]?.id ?? "");
  const [shippingOpen, setShippingOpen] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesSource, setRatesSource] = useState<"biteship" | "mock">("mock");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplying, setCouponApplying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<MidtransCheckoutPaymentId>("bni_va");
  const [submitting, setSubmitting] = useState(false);

  const subtotalGross = useMemo(() => lines.reduce((s, l) => s + l.listPrice * l.qty, 0), [lines]);
  const subtotalNet = useMemo(() => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0), [lines]);
  const catalogDiscount = Math.max(0, Math.round(subtotalGross - subtotalNet));
  const tax = 0;
  const shippingFee = selectedShipping?.price ?? 0;
  const grandTotal = Math.max(0, Math.round(subtotalNet) - couponDiscount + shippingFee + tax);
  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === addressId) ?? null,
    [addresses, addressId],
  );

  const loadRates = useCallback(async () => {
    if (!addressId) return;
    setRatesLoading(true);
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { source: "biteship" | "mock"; options: ShippingOption[]; message?: string };
        error?: string;
      };
      if (!json.success || !json.data) {
        toast.error(json.error ?? "Gagal memuat ongkir.");
        setShippingOptions([]);
        setSelectedShipping(null);
        return;
      }
      setRatesSource(json.data.source);
      setShippingOptions(json.data.options);
      setSelectedShipping(json.data.options[0] ?? null);
      if (json.data.source === "mock" && json.data.message) {
        toast.message("Ongkir estimasi", { description: json.data.message });
      }
    } catch {
      toast.error("Gagal memuat ongkir.");
      setShippingOptions([]);
      setSelectedShipping(null);
    } finally {
      setRatesLoading(false);
    }
  }, [addressId]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      setCouponDiscount(0);
      return;
    }
    setCouponApplying(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: Math.round(subtotalNet) }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { discountAmount: number };
        error?: string;
      };
      if (!json.success || !json.data) {
        toast.error(json.error ?? "Kupon tidak bisa dipakai.");
        setCouponDiscount(0);
        return;
      }
      setCouponDiscount(json.data.discountAmount);
      toast.success("Kupon diterapkan.");
    } catch {
      toast.error("Gagal memvalidasi kupon.");
      setCouponDiscount(0);
    } finally {
      setCouponApplying(false);
    }
  };

  const loadSnapScript = (clientKey: string, isProduction: boolean): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("no window"));
      if (window.snap) return resolve();
      const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans-snap="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("snap load error")), { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";
      s.async = true;
      s.dataset.midtransSnap = "1";
      s.setAttribute("data-client-key", clientKey);
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("snap load error"));
      document.body.appendChild(s);
    });
  };

  const handleCheckout = async () => {
    if (!addressId || !selectedShipping) {
      toast.error("Pilih alamat dan metode pengiriman.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          courierCode: selectedShipping.courierCode,
          serviceCode: selectedShipping.serviceCode,
          ratesSource,
          couponCode: couponInput.trim() || null,
          paymentMethod,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: {
          orderId: string;
          orderNumber: string;
          snapToken: string | null;
          clientKey: string | null;
          isProduction: boolean;
        };
        error?: string;
      };
      if (!json.success || !json.data) {
        toast.error(json.error ?? "Checkout gagal.");
        return;
      }

      const { orderId, snapToken, clientKey, isProduction } = json.data;

      if (snapToken && clientKey) {
        await loadSnapScript(clientKey, isProduction);
        if (!window.snap) {
          toast.error("Snap Midtrans tidak siap.");
          router.push(`/dashboard/orders/${orderId}`);
          return;
        }
        window.snap.pay(snapToken, {
          onSuccess: () => {
            router.push(`/dashboard/orders/${orderId}`);
          },
          onPending: () => {
            router.push(`/dashboard/orders/${orderId}`);
          },
          onError: () => {
            toast.error("Pembayaran gagal atau dibatalkan.");
            router.push(`/dashboard/orders/${orderId}`);
          },
          onClose: () => {
            router.push(`/dashboard/orders/${orderId}`);
          },
        });
      } else {
        toast.success("Pesanan dibuat. Lanjutkan pembayaran dari halaman pesanan.");
        router.push(`/dashboard/orders/${orderId}`);
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#f4f1ea]/50 to-transparent pb-20 pt-6 text-[#1d1d1f] sm:pt-8">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="px-2 py-2 sm:px-4">
          <CartCheckoutStepper current={2} />
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#e8e4dc] bg-white p-4 sm:p-6">
              <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f] sm:text-2xl">Checkout</h1>
              <p className="mt-1 text-sm text-[#5c5c5c]">Periksa barang sebelum memilih pengiriman dan pembayaran.</p>
              <ul className="mt-8 space-y-10">
                {lines.map((line) => (
                  <li key={line.lineId} className="border-b border-[#ece8e0] pb-10 last:border-0 last:pb-0">
                    <CartLineCard line={line} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="mt-8 space-y-4 lg:col-span-5 lg:mt-0">
            <div className="overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white shadow-sm">
              <div className="flex items-center justify-between bg-[#2a2a2c] px-4 py-3 text-white">
                <span className="text-sm font-semibold uppercase tracking-wider">Pilih alamat</span>
                <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
              </div>
              <div className="p-4">
                {addresses.length === 0 ? (
                  <p className="text-sm text-[#5c5c5c]">Belum ada alamat tersimpan.</p>
                ) : (
                  <>
                    <label htmlFor="checkout-address" className="sr-only">
                      Alamat pengiriman
                    </label>
                    <select
                      id="checkout-address"
                      value={addressId}
                      onChange={(e) => setAddressId(e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#e0e0e0] bg-white px-3 text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#EA5329]/30"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {(a.label ?? "Alamat").trim()} — {a.city}
                        </option>
                      ))}
                    </select>
                    {selectedAddress ? (
                      <div className="mt-3 text-sm leading-relaxed text-[#333333]">
                        <p className="font-semibold text-[#1d1d1f]">{selectedAddress.recipient}</p>
                        <p className="mt-1 text-[#5c5c5c]">
                          {selectedAddress.full_address}, {selectedAddress.district}, {selectedAddress.city},{" "}
                          {selectedAddress.province} {selectedAddress.postal_code}
                        </p>
                        <p className="mt-1 text-[#5c5c5c]">{selectedAddress.phone}</p>
                      </div>
                    ) : null}
                  </>
                )}
                <Link
                  href="/dashboard/addresses/new?redirectTo=/checkout"
                  className="mt-4 inline-block text-sm font-semibold text-[#EA5329] hover:underline"
                >
                  Tambah alamat baru
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#1a1a1a]/40 bg-[#1a1a1a] text-white shadow-lg">
              <div className="px-5 pt-5">
                <h2 className="text-lg font-bold tracking-tight">Ringkasan pesanan</h2>
                <dl className="mt-5 space-y-3 border-b border-white/15 pb-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/75">Sub total ({itemCount} item)</dt>
                    <dd className="shrink-0 font-semibold tabular-nums">{formatRupiah(subtotalGross)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/75">Diskon katalog</dt>
                    <dd className={cn("shrink-0 font-semibold tabular-nums", catalogDiscount > 0 && "text-[#ffb4a1]")}>
                      {catalogDiscount > 0 ? `−${formatRupiah(catalogDiscount)}` : formatRupiah(0)}
                    </dd>
                  </div>
                  {couponDiscount > 0 ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/75">Diskon kupon</dt>
                      <dd className="shrink-0 font-semibold tabular-nums text-[#ffb4a1]">
                        −{formatRupiah(couponDiscount)}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/75">Pajak</dt>
                    <dd className="shrink-0 font-semibold tabular-nums">{formatRupiah(tax)}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => setShippingOpen((o) => !o)}
                  className="mt-4 flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <span>Metode pengiriman</span>
                  {shippingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {shippingOpen ? (
                  <div className="mt-3 space-y-2 pb-4">
                    {ratesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menghitung ongkir…
                      </div>
                    ) : shippingOptions.length === 0 ? (
                      <p className="text-sm text-white/70">Tidak ada tarif untuk alamat ini.</p>
                    ) : (
                      shippingOptions.map((opt) => {
                        const selected =
                          selectedShipping?.courierCode === opt.courierCode &&
                          selectedShipping?.serviceCode === opt.serviceCode;
                        return (
                          <label
                            key={`${opt.courierCode}-${opt.serviceCode}`}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                              selected ? "border-[#EA5329] bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10",
                            )}
                          >
                            <input
                              type="radio"
                              name="ship"
                              className="mt-1 accent-[#EA5329]"
                              checked={selected}
                              onChange={() => setSelectedShipping(opt)}
                            />
                            <span>
                              <span className="font-semibold">
                                {opt.courierName} — {opt.serviceName}
                              </span>
                              <span className="mt-0.5 block text-xs text-white/70">{opt.etd}</span>
                              <span className="mt-1 block text-sm font-bold tabular-nums text-white">
                                {formatRupiah(opt.price)}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <p className="mt-2 pb-4 text-xs text-white/60">
                    {selectedShipping
                      ? `${selectedShipping.courierName} (${formatRupiah(selectedShipping.price)})`
                      : "Belum dipilih"}
                  </p>
                )}

                <div className="border-t border-white/15 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Ada kupon diskon?</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Kode kupon"
                      className="h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#EA5329]/40"
                    />
                    <button
                      type="button"
                      onClick={() => void applyCoupon()}
                      disabled={couponApplying}
                      className="h-11 shrink-0 rounded-lg border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {couponApplying ? "…" : "Pakai"}
                    </button>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-white/15 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Total</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{formatRupiah(grandTotal)}</p>
                    {couponDiscount > 0 ? (
                      <p className="mt-1 text-[11px] text-white/55">Sudah termasuk diskon kupon.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-[#1d1d1f]">Metode pembayaran</h2>
              <p className="mt-1 text-xs text-[#7a7a7a]">Pilih salah satu. Anda akan menyelesaikan pembayaran di Snap Midtrans.</p>
              <ul className="mt-4 space-y-2">
                {MIDTRANS_CHECKOUT_PAYMENT_OPTIONS.map((m) => (
                  <li key={m.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition",
                        paymentMethod === m.id ? "border-[#EA5329] bg-[#fff8f5]" : "border-[#e8e4dc] hover:border-[#EA5329]/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="pay"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="accent-[#EA5329]"
                      />
                      <span className="flex flex-1 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7] text-[10px] font-bold text-[#1d1d1f]">
                          {m.id.replace("_va", "").replace("indomaret", "IND").toUpperCase().slice(0, 3)}
                        </span>
                        <span className="font-medium text-[#1d1d1f]">{m.label}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={submitting || !addressId || !selectedShipping || addresses.length === 0}
                onClick={() => void handleCheckout()}
                className="mt-6 flex w-full items-center justify-center rounded-full bg-[#EA5329] py-3.5 text-center text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#d94a24] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses…
                  </>
                ) : (
                  "Beli sekarang"
                )}
              </button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-[#9a9590]">
                Dengan melanjutkan, Anda menyetujui syarat pembayaran Midtrans dan kebijakan toko. Asuransi pengiriman
                mengikuti ketentuan kurir (Biteship).
              </p>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
