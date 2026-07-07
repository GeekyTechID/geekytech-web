# Perbaikan Item #7-11 Audit Midtrans — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup 5 temuan "Perlu Diperhatikan" dari audit Midtrans (#7 chat guest, #8 email konsisten, #9 WA dinamis di halaman legal/FAQ, #10 alamat retur dinamis, #11 nama badan usaha di halaman publik).

**Architecture:** Reuse penuh infrastruktur `lib/settings/` yang sudah ada (`getStoreOrigin`, `getWhatsappCs`, `getStoreOriginFullAddress`) dari putaran sebelumnya — tidak ada tabel/kolom baru. Tambah satu konstanta baru (`LEGAL_ENTITY_NAME`) untuk nama badan usaha. Halaman-halaman statis yang punya bagian kontak (3 halaman legal + FAQ) diubah jadi async Server Component mengikuti pola yang sudah dipakai di `/contact`.

**Tech Stack:** Next.js 16 App Router + TypeScript (strict), Tailwind v4 (className only), Supabase (Postgres + RLS). **Tidak ada test runner otomatis** — verifikasi lewat `npx tsc --noEmit`, `npx eslint <file yang diubah>` (JANGAN `npm run lint` project-wide — ada ribuan lint error pre-existing tidak terkait), dan pengecekan manual browser via `npm run dev`.

## Global Constraints

- Path alias `@/` untuk semua import baru.
- Semua styling lewat `className` Tailwind, tidak ada CSS/`<style>` baru.
- `getStoreOrigin()`, `getWhatsappCs()` (dari `@/lib/settings/queries`) dan `getStoreOriginFullAddress()`, `getStoreOriginMapsUrl()` (dari `@/lib/settings/store-origin`) **sudah ada, jangan didefinisikan ulang** — import saja.
- Domain email publik yang benar: `support@geeky.id` (BUKAN `geekytech.com`, BUKAN field settings baru — literal string, sesuai keputusan).
- Nomor WhatsApp CS: dari `settings.whatsapp_cs` via `getWhatsappCs()` — saat ini production masih berisi placeholder `6281234567890` (bukan bug kode, tunggu admin isi data asli).
- Nama badan usaha: `"CV. Sentosa Berkat Jaya"` — konstanta statis di `lib/constants/business-identity.ts`, BUKAN dari `settings`.
- Item #7: WhatsApp floating button (`components/layout/whatsapp-button.tsx`) TIDAK dihidupkan kembali — sudah ada Chat CS, guest diarahkan ke login lewat chat yang sama.
- Repo tidak punya test framework — jangan tulis file test baru, verifikasi lewat tsc + eslint scoped + manual browser check.

---

## Task 1: ChatWidget Tampil untuk Guest, Arahkan ke Login

**Files:**
- Modify: `components/chat/chat-widget.tsx` (seluruh file, 120 baris)

**Interfaces:** Tidak ada — perubahan tampilan murni, tidak ada fungsi baru yang dikonsumsi task lain.

- [ ] **Step 1: Ganti seluruh isi `components/chat/chat-widget.tsx`**

Old (seluruh file saat ini):
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { HEADER_DROPDOWN_PANEL_CLASS } from "@/components/shared/header-dropdown-panel";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { ChatPopup } from "./chat-popup";
import { ChatSessionForm } from "./chat-session-form";
import type { ChatSession } from "@/types/chat";

export function ChatWidget() {
  const user = useAuthStore((s) => s.user);
  const { isOpen, activeSession, unreadCount, setOpen, setActiveSession } = useChatStore();
  const [initialized, setInitialized] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Fetch active session on user login
  useEffect(() => {
    if (!user) return;
    fetch("/api/chat/sessions")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setActiveSession(json.data as ChatSession);
      })
      .finally(() => setInitialized(true));
  }, [user, setActiveSession]);

  // Animate popup open
  useGSAP(
    () => {
      if (!isOpen || !popupRef.current) return;
      gsap.fromTo(
        popupRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" },
      );
    },
    { dependencies: [isOpen], scope: popupRef },
  );

  function handleClose() {
    if (!popupRef.current) { setOpen(false); return; }
    gsap.to(popupRef.current, {
      opacity: 0, y: 20, scale: 0.95,
      duration: 0.2, ease: "power2.in",
      onComplete: () => setOpen(false),
    });
  }

  function handleSessionCreated(sessionId: string) {
    fetch(`/api/chat/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setActiveSession(json.data as ChatSession); });
  }

  // Not logged in → don't render
  if (!user) return null;

  const showForm = initialized && !activeSession;
  const showChat = initialized && !!activeSession;

  return (
    <>
      {/* Popup panel */}
      {isOpen && (
        <div
          ref={popupRef}
          className={cn(
            "fixed z-50",
            HEADER_DROPDOWN_PANEL_CLASS,
            "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
            "md:bottom-20 md:right-6",
            "w-[calc(100vw-2rem)] max-w-[420px]",
            showForm ? "h-auto" : "h-[600px] max-h-[80vh]",
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Tutup chat"
          >
            <X size={14} />
          </button>

          {showForm && <ChatSessionForm onCreated={handleSessionCreated} />}
          {showChat && <ChatPopup />}
        </div>
      )}

      {/* Floating button — hidden when popup is open */}
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : setOpen(true))}
        aria-label={isOpen ? "Tutup chat" : "Buka chat CS"}
        className={cn(
          "fixed z-50",
          "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
          "md:bottom-6 md:right-6",
          "flex items-center gap-2 rounded-full px-4 py-3",
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
          "transition-all duration-200",
          isOpen && "opacity-0 pointer-events-none scale-90",
        )}
      >
        <MessageCircle size={20} className="shrink-0" />
        <span className="hidden text-xs font-bold uppercase sm:inline">Chat CS</span>
        {unreadCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
```

New (seluruh file):
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  HEADER_DROPDOWN_PANEL_CLASS,
  HeaderDropdownPanelHeader,
  HeaderDropdownPanelBody,
} from "@/components/shared/header-dropdown-panel";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { ChatPopup } from "./chat-popup";
import { ChatSessionForm } from "./chat-session-form";
import type { ChatSession } from "@/types/chat";

export function ChatWidget() {
  const user = useAuthStore((s) => s.user);
  const { isOpen, activeSession, unreadCount, setOpen, setActiveSession } = useChatStore();
  const [initialized, setInitialized] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fetch active session on user login
  useEffect(() => {
    if (!user) return;
    fetch("/api/chat/sessions")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setActiveSession(json.data as ChatSession);
      })
      .finally(() => setInitialized(true));
  }, [user, setActiveSession]);

  // Animate popup open
  useGSAP(
    () => {
      if (!isOpen || !popupRef.current) return;
      gsap.fromTo(
        popupRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" },
      );
    },
    { dependencies: [isOpen], scope: popupRef },
  );

  function handleClose() {
    if (!popupRef.current) { setOpen(false); return; }
    gsap.to(popupRef.current, {
      opacity: 0, y: 20, scale: 0.95,
      duration: 0.2, ease: "power2.in",
      onComplete: () => setOpen(false),
    });
  }

  function handleSessionCreated(sessionId: string) {
    fetch(`/api/chat/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setActiveSession(json.data as ChatSession); });
  }

  const showForm = !!user && initialized && !activeSession;
  const showChat = !!user && initialized && !!activeSession;

  return (
    <>
      {/* Popup panel */}
      {isOpen && (
        <div
          ref={popupRef}
          className={cn(
            "fixed z-50",
            HEADER_DROPDOWN_PANEL_CLASS,
            "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
            "md:bottom-20 md:right-6",
            "w-[calc(100vw-2rem)] max-w-[420px]",
            !user || showForm ? "h-auto" : "h-[600px] max-h-[80vh]",
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Tutup chat"
          >
            <X size={14} />
          </button>

          {!user && (
            <div className="flex flex-col">
              <HeaderDropdownPanelHeader title="Chat CS" />
              <HeaderDropdownPanelBody className="flex flex-col items-center gap-4 p-6 text-center">
                <MessageCircle size={28} className="text-[#EA5329]" />
                <div>
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">
                    Masuk untuk mulai chat
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.43] text-[#7a7a7a]">
                    Masuk atau daftar dulu supaya tim kami bisa membalas pertanyaanmu.
                  </p>
                </div>
                <Link
                  href={`/login?redirectTo=${encodeURIComponent(pathname)}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#EA5329] px-5 text-[13px] font-bold uppercase text-white transition-colors hover:bg-[#d44820]"
                >
                  Masuk / Daftar
                </Link>
              </HeaderDropdownPanelBody>
            </div>
          )}
          {showForm && <ChatSessionForm onCreated={handleSessionCreated} />}
          {showChat && <ChatPopup />}
        </div>
      )}

      {/* Floating button — hidden when popup is open */}
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : setOpen(true))}
        aria-label={isOpen ? "Tutup chat" : "Buka chat CS"}
        className={cn(
          "fixed z-50",
          "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
          "md:bottom-6 md:right-6",
          "flex items-center gap-2 rounded-full px-4 py-3",
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
          "transition-all duration-200",
          isOpen && "opacity-0 pointer-events-none scale-90",
        )}
      >
        <MessageCircle size={20} className="shrink-0" />
        <span className="hidden text-xs font-bold uppercase sm:inline">Chat CS</span>
        {unreadCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
```

Perubahan kunci: (1) hapus `if (!user) return null` — komponen selalu render; (2) `showForm`/`showChat` sekarang juga mensyaratkan `!!user`; (3) tinggi panel jadi `h-auto` juga untuk guest (`!user`); (4) tambah blok guest-prompt yang pakai `HeaderDropdownPanelHeader`/`HeaderDropdownPanelBody` yang sama seperti `ChatSessionForm` supaya tombol close (teks putih) tetap kontras di atas header gelap `#2a2a2c`; (5) `usePathname()` untuk redirect balik ke halaman asal setelah login.

- [ ] **Step 2: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint components/chat/chat-widget.tsx`
Expected: tidak ada error baru.

- [ ] **Step 3: Verifikasi manual di browser**

Run: `npm run dev`.
- Buka situs dalam kondisi belum login (mode incognito atau logout dulu) → tombol "Chat CS" tetap tampil di pojok kanan bawah.
- Klik tombol → panel muncul dengan header gelap "Chat CS", isi "Masuk untuk mulai chat", tombol "Masuk / Daftar".
- Klik tombol "Masuk / Daftar" → diarahkan ke `/login?redirectTo=<path halaman asal>` (cek URL di address bar).
- Login sebagai user biasa → buka chat lagi → perilaku sama seperti sebelumnya (form topik baru atau popup chat aktif, tidak ada regresi).

- [ ] **Step 4: Commit**

```bash
git add components/chat/chat-widget.tsx
git commit -m "feat: tampilkan Chat CS untuk guest, arahkan ke login saat dibuka"
```

---

## Task 2: Konstanta Nama Badan Usaha + Footer

**Files:**
- Create: `lib/constants/business-identity.ts`
- Modify: `components/store/store-footer.tsx`

**Interfaces:**
- Produces: `LEGAL_ENTITY_NAME: string` dari `@/lib/constants/business-identity`. Task 5 mengonsumsi ini.

- [ ] **Step 1: Buat `lib/constants/business-identity.ts`**

```ts
export const LEGAL_ENTITY_NAME = "CV. Sentosa Berkat Jaya";
```

- [ ] **Step 2: Update import di `components/store/store-footer.tsx`**

Old:
```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchShopBrands } from "@/lib/data/home-storefront";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress } from "@/lib/settings/store-origin";
```

New:
```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchShopBrands } from "@/lib/data/home-storefront";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress } from "@/lib/settings/store-origin";
import { LEGAL_ENTITY_NAME } from "@/lib/constants/business-identity";
```

- [ ] **Step 3: Ganti string hardcode di baris copyright**

Old:
```tsx
              <p>© {year} GeekyTech by CV. Sentosa Berkat Jaya. All rights reserved.</p>
```

New:
```tsx
              <p>© {year} GeekyTech by {LEGAL_ENTITY_NAME}. All rights reserved.</p>
```

- [ ] **Step 4: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint lib/constants/business-identity.ts components/store/store-footer.tsx`
Expected: tidak ada error baru.

- [ ] **Step 5: Verifikasi manual di browser**

Run: `npm run dev`, scroll ke footer halaman manapun → baris copyright tetap menampilkan "© 2026 GeekyTech by CV. Sentosa Berkat Jaya. All rights reserved." (tampilan sama persis seperti sebelumnya, sumbernya saja yang berubah).

- [ ] **Step 6: Commit**

```bash
git add lib/constants/business-identity.ts components/store/store-footer.tsx
git commit -m "refactor: pindahkan nama badan usaha ke konstanta bersama"
```

---

## Task 3: Email & WhatsApp Dinamis di 3 Halaman Legal

**Files:**
- Modify: `app/(public)/syarat-ketentuan/page.tsx` (seluruh file)
- Modify: `app/(public)/kebijakan-privasi/page.tsx` (seluruh file)
- Modify: `app/(public)/kebijakan-pengembalian/page.tsx` (seluruh file)

**Interfaces:**
- Consumes: `getWhatsappCs(): Promise<string>` dari `@/lib/settings/queries` (sudah ada dari putaran sebelumnya).

- [ ] **Step 1: Ganti seluruh isi `app/(public)/syarat-ketentuan/page.tsx`**

Old (seluruh file saat ini, 240 baris):
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan platform GeekyTech. Harap baca dengan seksama sebelum melakukan pembelian.",
};

const sections = [
  {
    title: "1. Pengertian dan Definisi",
    content: [
      "GeekyTech adalah platform perdagangan elektronik (e-commerce) yang menyediakan layanan penjualan produk teknologi dan gadget original bergaransi.",
      "Pengguna adalah setiap individu yang mengakses, menjelajahi, atau melakukan transaksi di platform GeekyTech.",
      "Produk adalah barang teknologi dan gadget original yang dijual melalui platform GeekyTech dengan jaminan keaslian dan garansi resmi.",
    ],
  },
  {
    title: "2. Penggunaan Platform",
    content: [
      "Dengan mengakses dan menggunakan platform GeekyTech, Anda setuju untuk mematuhi syarat dan ketentuan ini secara penuh.",
      "Anda harus berusia minimal 18 tahun atau memiliki izin dari orang tua/wali untuk menggunakan layanan kami.",
      "Anda bertanggung jawab untuk menjaga kerahasiaan informasi akun Anda dan tidak boleh membagikan password kepada siapapun.",
      "Anda setuju untuk tidak menggunakan platform untuk aktivitas ilegal, merugikan, atau melanggar hak pihak ketiga.",
    ],
  },
  {
    title: "3. Produk dan Harga",
    content: [
      "Semua produk yang ditampilkan di platform GeekyTech adalah barang original dengan garansi resmi dari distributor resmi.",
      "Harga produk dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya. Harga yang berlaku adalah harga pada saat Anda melakukan checkout.",
      "Kami berhak untuk membatasi atau membatalkan pesanan jika ada kesalahan informasi produk atau harga.",
      "Stok produk terbatas dan tersedia sesuai dengan ketersediaan. Jika produk kosong, pesanan Anda akan dibatalkan dan dana dikembalikan penuh.",
    ],
  },
  {
    title: "4. Pemesanan dan Pembayaran",
    content: [
      "Untuk melakukan pembelian, Anda harus membuat akun dan mengisi formulir pesanan dengan informasi yang akurat dan lengkap.",
      "Pesanan dianggap sah setelah Anda menerima konfirmasi dari GeekyTech dan melakukan pembayaran sesuai dengan jumlah yang ditampilkan.",
      "Kami menerima berbagai metode pembayaran termasuk transfer bank, kartu kredit, e-wallet, dan cicilan tanpa bunga.",
      "Pembayaran harus dilakukan dalam waktu 3 jam setelah pesanan dibuat. Pesanan yang belum dibayar dalam waktu tersebut akan otomatis dibatalkan.",
    ],
  },
  {
    title: "5. Pengiriman dan Pengemasan",
    content: [
      "Pengiriman dilakukan oleh kurir terpercaya yang telah bekerja sama dengan GeekyTech. Produk akan dikemas dengan aman dan profesional.",
      "Estimasi waktu pengiriman untuk Jakarta adalah 1-2 hari kerja, sedangkan untuk luar Jakarta adalah 2-4 hari kerja tergantung lokasi.",
      "Anda akan menerima notifikasi dengan nomor resi pengiriman (AWB) melalui email dan SMS setelah paket dikirim.",
      "Kami tidak bertanggung jawab atas keterlambatan pengiriman yang disebabkan oleh kondisi cuaca ekstrem, bencana alam, atau kondisi luar biasa lainnya.",
      "Pengiriman dilakukan ke alamat yang Anda daftarkan saat checkout. Jika alamat tidak akurat, tanggung jawab ada pada pembeli.",
    ],
  },
  {
    title: "6. Penerimaan Barang",
    content: [
      "Saat menerima paket, mohon periksa kondisi kemasan dan isi paket sebelum menandatangani bukti pengiriman.",
      "Jika terdapat kerusakan atau barang tidak sesuai, segera hubungi customer service kami dalam waktu maksimal 24 jam.",
      "Barang dianggap diterima dengan baik jika penerima tidak melaporkan kerusakan atau ketidaksesuaian dalam waktu 24 jam setelah barang diterima.",
    ],
  },
  {
    title: "7. Pengembalian dan Penukaran",
    content: [
      "GeekyTech menyediakan kebijakan pengembalian gratis dalam waktu 7 hari setelah barang sampai, dengan syarat barang dalam kondisi original dan belum digunakan.",
      "Pengembalian karena kecacatan pabrik dapat dilakukan kapan saja selama garansi resmi masih berlaku.",
      "Ketentuan lengkap mengenai syarat, cara pengajuan, dan estimasi waktu pengembalian dana dijelaskan secara rinci di halaman Kebijakan Pengembalian.",
    ],
  },
  {
    title: "8. Garansi Produk",
    content: [
      "Semua produk GeekyTech dilengkapi dengan garansi resmi dari distributor atau manufacturer sesuai dengan jenis produk.",
      "Garansi tidak berlaku jika produk digunakan tidak sesuai dengan panduan penggunaan atau mengalami kerusakan akibat penyalahgunaan.",
      "Untuk klaim garansi, hubungi customer service kami dan kami akan membantu proses garansi Anda ke pihak manufacturer.",
      "GeekyTech berhak menolak klaim garansi jika cacat merupakan hasil dari penggunaan yang tidak benar atau modifikasi.",
    ],
  },
  {
    title: "9. Pembatasan Tanggung Jawab",
    content: [
      "GeekyTech tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, atau konsekuensial yang mungkin timbul dari penggunaan platform atau produk kami.",
      "Tanggung jawab GeekyTech terbatas pada nilai produk yang dibeli melalui platform kami.",
      "GeekyTech tidak bertanggung jawab atas kehilangan atau kerusakan barang yang disebabkan oleh kesalahan pembeli dalam memberikan alamat atau data pribadi.",
    ],
  },
  {
    title: "10. Privasi dan Data Pribadi",
    content: [
      "GeekyTech menghormati privasi Anda dan berkomitmen untuk melindungi data pribadi Anda sesuai dengan undang-undang perlindungan data yang berlaku.",
      "Informasi pribadi Anda hanya akan digunakan untuk keperluan transaksi, pengiriman, dan komunikasi terkait pesanan Anda.",
      "Kami tidak akan membagikan data pribadi Anda kepada pihak ketiga tanpa izin dari Anda, kecuali diperlukan untuk proses pengiriman atau keperluan hukum.",
      "Untuk informasi lengkap tentang bagaimana kami menangani data Anda, silakan baca Kebijakan Privasi kami.",
    ],
  },
  {
    title: "11. Larangan dan Batasan",
    content: [
      "Anda tidak boleh menggunakan platform GeekyTech untuk tujuan yang ilegal, merugikan, atau melanggar hak pihak lain.",
      "Anda tidak boleh mengunggah atau mendistribusikan konten yang mengandung malware, virus, atau kode berbahaya lainnya.",
      "Anda tidak boleh melakukan aktivitas yang dapat mengganggu atau merusak keamanan platform GeekyTech.",
      "GeekyTech berhak untuk menangguhkan atau menutup akun Anda jika Anda melanggar syarat dan ketentuan ini.",
    ],
  },
  {
    title: "12. Perubahan Syarat dan Ketentuan",
    content: [
      "GeekyTech berhak untuk mengubah syarat dan ketentuan ini kapan saja tanpa pemberitahuan sebelumnya.",
      "Perubahan akan berlaku sejak tanggal yang ditentukan di halaman ini. Penggunaan berkelanjutan platform setelah perubahan berarti Anda menerima syarat dan ketentuan yang baru.",
      "Kami akan memberitahu Anda tentang perubahan signifikan melalui email atau notifikasi di platform kami.",
    ],
  },
  {
    title: "13. Hukum dan Yurisdiksi",
    content: [
      "Syarat dan ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di Republik Indonesia.",
      "Setiap sengketa yang timbul dari atau berkaitan dengan syarat dan ketentuan ini akan diselesaikan melalui jalur musyawarah terlebih dahulu.",
      "Jika musyawarah tidak berhasil, sengketa akan diselesaikan melalui pengadilan yang berwenang di Jakarta Selatan.",
    ],
  },
  {
    title: "14. Kontak Kami",
    content: [
      "Jika Anda memiliki pertanyaan tentang syarat dan ketentuan ini, silakan hubungi kami melalui:",
      "Email: support@geekytech.com",
      "WhatsApp: +62 812-3456-7890",
      "Jam operasional: Senin - Minggu, 09:00 - 21:00",
    ],
  },
];

export default function TermsPage() {
  return (
```
*(sisa file — hero, content section yang me-render `sections.map(...)`, related links — tidak berubah, lihat file saat ini baris 137-239)*

New (bagian yang berubah — dari awal file sampai pembukaan `return`):
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getWhatsappCs } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan platform GeekyTech. Harap baca dengan seksama sebelum melakukan pembelian.",
};

export default async function SyaratKetentuanPage() {
  const whatsappCs = await getWhatsappCs();

  const sections = [
    {
      title: "1. Pengertian dan Definisi",
      content: [
        "GeekyTech adalah platform perdagangan elektronik (e-commerce) yang menyediakan layanan penjualan produk teknologi dan gadget original bergaransi.",
        "Pengguna adalah setiap individu yang mengakses, menjelajahi, atau melakukan transaksi di platform GeekyTech.",
        "Produk adalah barang teknologi dan gadget original yang dijual melalui platform GeekyTech dengan jaminan keaslian dan garansi resmi.",
      ],
    },
    {
      title: "2. Penggunaan Platform",
      content: [
        "Dengan mengakses dan menggunakan platform GeekyTech, Anda setuju untuk mematuhi syarat dan ketentuan ini secara penuh.",
        "Anda harus berusia minimal 18 tahun atau memiliki izin dari orang tua/wali untuk menggunakan layanan kami.",
        "Anda bertanggung jawab untuk menjaga kerahasiaan informasi akun Anda dan tidak boleh membagikan password kepada siapapun.",
        "Anda setuju untuk tidak menggunakan platform untuk aktivitas ilegal, merugikan, atau melanggar hak pihak ketiga.",
      ],
    },
    {
      title: "3. Produk dan Harga",
      content: [
        "Semua produk yang ditampilkan di platform GeekyTech adalah barang original dengan garansi resmi dari distributor resmi.",
        "Harga produk dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya. Harga yang berlaku adalah harga pada saat Anda melakukan checkout.",
        "Kami berhak untuk membatasi atau membatalkan pesanan jika ada kesalahan informasi produk atau harga.",
        "Stok produk terbatas dan tersedia sesuai dengan ketersediaan. Jika produk kosong, pesanan Anda akan dibatalkan dan dana dikembalikan penuh.",
      ],
    },
    {
      title: "4. Pemesanan dan Pembayaran",
      content: [
        "Untuk melakukan pembelian, Anda harus membuat akun dan mengisi formulir pesanan dengan informasi yang akurat dan lengkap.",
        "Pesanan dianggap sah setelah Anda menerima konfirmasi dari GeekyTech dan melakukan pembayaran sesuai dengan jumlah yang ditampilkan.",
        "Kami menerima berbagai metode pembayaran termasuk transfer bank, kartu kredit, e-wallet, dan cicilan tanpa bunga.",
        "Pembayaran harus dilakukan dalam waktu 3 jam setelah pesanan dibuat. Pesanan yang belum dibayar dalam waktu tersebut akan otomatis dibatalkan.",
      ],
    },
    {
      title: "5. Pengiriman dan Pengemasan",
      content: [
        "Pengiriman dilakukan oleh kurir terpercaya yang telah bekerja sama dengan GeekyTech. Produk akan dikemas dengan aman dan profesional.",
        "Estimasi waktu pengiriman untuk Jakarta adalah 1-2 hari kerja, sedangkan untuk luar Jakarta adalah 2-4 hari kerja tergantung lokasi.",
        "Anda akan menerima notifikasi dengan nomor resi pengiriman (AWB) melalui email dan SMS setelah paket dikirim.",
        "Kami tidak bertanggung jawab atas keterlambatan pengiriman yang disebabkan oleh kondisi cuaca ekstrem, bencana alam, atau kondisi luar biasa lainnya.",
        "Pengiriman dilakukan ke alamat yang Anda daftarkan saat checkout. Jika alamat tidak akurat, tanggung jawab ada pada pembeli.",
      ],
    },
    {
      title: "6. Penerimaan Barang",
      content: [
        "Saat menerima paket, mohon periksa kondisi kemasan dan isi paket sebelum menandatangani bukti pengiriman.",
        "Jika terdapat kerusakan atau barang tidak sesuai, segera hubungi customer service kami dalam waktu maksimal 24 jam.",
        "Barang dianggap diterima dengan baik jika penerima tidak melaporkan kerusakan atau ketidaksesuaian dalam waktu 24 jam setelah barang diterima.",
      ],
    },
    {
      title: "7. Pengembalian dan Penukaran",
      content: [
        "GeekyTech menyediakan kebijakan pengembalian gratis dalam waktu 7 hari setelah barang sampai, dengan syarat barang dalam kondisi original dan belum digunakan.",
        "Pengembalian karena kecacatan pabrik dapat dilakukan kapan saja selama garansi resmi masih berlaku.",
        "Ketentuan lengkap mengenai syarat, cara pengajuan, dan estimasi waktu pengembalian dana dijelaskan secara rinci di halaman Kebijakan Pengembalian.",
      ],
    },
    {
      title: "8. Garansi Produk",
      content: [
        "Semua produk GeekyTech dilengkapi dengan garansi resmi dari distributor atau manufacturer sesuai dengan jenis produk.",
        "Garansi tidak berlaku jika produk digunakan tidak sesuai dengan panduan penggunaan atau mengalami kerusakan akibat penyalahgunaan.",
        "Untuk klaim garansi, hubungi customer service kami dan kami akan membantu proses garansi Anda ke pihak manufacturer.",
        "GeekyTech berhak menolak klaim garansi jika cacat merupakan hasil dari penggunaan yang tidak benar atau modifikasi.",
      ],
    },
    {
      title: "9. Pembatasan Tanggung Jawab",
      content: [
        "GeekyTech tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, atau konsekuensial yang mungkin timbul dari penggunaan platform atau produk kami.",
        "Tanggung jawab GeekyTech terbatas pada nilai produk yang dibeli melalui platform kami.",
        "GeekyTech tidak bertanggung jawab atas kehilangan atau kerusakan barang yang disebabkan oleh kesalahan pembeli dalam memberikan alamat atau data pribadi.",
      ],
    },
    {
      title: "10. Privasi dan Data Pribadi",
      content: [
        "GeekyTech menghormati privasi Anda dan berkomitmen untuk melindungi data pribadi Anda sesuai dengan undang-undang perlindungan data yang berlaku.",
        "Informasi pribadi Anda hanya akan digunakan untuk keperluan transaksi, pengiriman, dan komunikasi terkait pesanan Anda.",
        "Kami tidak akan membagikan data pribadi Anda kepada pihak ketiga tanpa izin dari Anda, kecuali diperlukan untuk proses pengiriman atau keperluan hukum.",
        "Untuk informasi lengkap tentang bagaimana kami menangani data Anda, silakan baca Kebijakan Privasi kami.",
      ],
    },
    {
      title: "11. Larangan dan Batasan",
      content: [
        "Anda tidak boleh menggunakan platform GeekyTech untuk tujuan yang ilegal, merugikan, atau melanggar hak pihak lain.",
        "Anda tidak boleh mengunggah atau mendistribusikan konten yang mengandung malware, virus, atau kode berbahaya lainnya.",
        "Anda tidak boleh melakukan aktivitas yang dapat mengganggu atau merusak keamanan platform GeekyTech.",
        "GeekyTech berhak untuk menangguhkan atau menutup akun Anda jika Anda melanggar syarat dan ketentuan ini.",
      ],
    },
    {
      title: "12. Perubahan Syarat dan Ketentuan",
      content: [
        "GeekyTech berhak untuk mengubah syarat dan ketentuan ini kapan saja tanpa pemberitahuan sebelumnya.",
        "Perubahan akan berlaku sejak tanggal yang ditentukan di halaman ini. Penggunaan berkelanjutan platform setelah perubahan berarti Anda menerima syarat dan ketentuan yang baru.",
        "Kami akan memberitahu Anda tentang perubahan signifikan melalui email atau notifikasi di platform kami.",
      ],
    },
    {
      title: "13. Hukum dan Yurisdiksi",
      content: [
        "Syarat dan ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di Republik Indonesia.",
        "Setiap sengketa yang timbul dari atau berkaitan dengan syarat dan ketentuan ini akan diselesaikan melalui jalur musyawarah terlebih dahulu.",
        "Jika musyawarah tidak berhasil, sengketa akan diselesaikan melalui pengadilan yang berwenang di Jakarta Selatan.",
      ],
    },
    {
      title: "14. Kontak Kami",
      content: [
        "Jika Anda memiliki pertanyaan tentang syarat dan ketentuan ini, silakan hubungi kami melalui:",
        "Email: support@geeky.id",
        `WhatsApp: ${whatsappCs ? `+${whatsappCs}` : "Belum diatur"}`,
        "Jam operasional: Senin - Minggu, 09:00 - 21:00",
      ],
    },
  ];

  return (
```

Sisa file (dari `<div className="bg-white">` sampai penutup, termasuk hero/content/related-links yang me-render `sections.map(...)`) **tidak berubah** — copy persis dari file saat ini baris 137-239 (hanya level indentasi menyesuaikan karena sekarang berada di dalam function, tidak mengubah struktur JSX apapun).

- [ ] **Step 2: Ganti seluruh isi `app/(public)/kebijakan-privasi/page.tsx`**

Old (bagian awal file, sebelum array `sections`):
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for GeekyTech. Learn how we collect, use, and protect your personal data.",
};

const sections = [
```

New (bagian awal file — perhatikan deklarasi function pindah ke sini, ditambah `async`):
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getWhatsappCs } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for GeekyTech. Learn how we collect, use, and protect your personal data.",
};

export default async function KebijakanPrivasiPage() {
  const whatsappCs = await getWhatsappCs();

  const sections = [
```

Sebelas section pertama (1-11, isi sama persis seperti file saat ini baris 13-114) disalin apa adanya, hanya bertambah satu level indentasi karena sekarang di dalam function. Section 12 "Kontak Kami" diubah:

Old (section 12 saja):
```tsx
  {
    title: "12. Hubungi Kami",
    content: [
      "Jika Anda memiliki pertanyaan, kekhawatiran, atau permintaan terkait privasi data Anda, silakan hubungi kami melalui:",
      "Email: support@geekytech.com",
      "WhatsApp: +62 812-3456-7890",
      "Jam operasional: Senin - Minggu, 09:00 - 21:00",
      "Kami akan merespons pertanyaan privasi Anda dalam waktu 7 hari kerja.",
    ],
  },
```

New (section 12 saja — 11 section lainnya persis sama seperti file saat ini, hanya dipindah ke dalam function):
```tsx
    {
      title: "12. Hubungi Kami",
      content: [
        "Jika Anda memiliki pertanyaan, kekhawatiran, atau permintaan terkait privasi data Anda, silakan hubungi kami melalui:",
        "Email: support@geeky.id",
        `WhatsApp: ${whatsappCs ? `+${whatsappCs}` : "Belum diatur"}`,
        "Jam operasional: Senin - Minggu, 09:00 - 21:00",
        "Kami akan merespons pertanyaan privasi Anda dalam waktu 7 hari kerja.",
      ],
    },
```

Setelah penutup array (`];`), hapus baris lama berikut (fungsinya sudah dipindah ke bagian awal file di atas):

Old:
```tsx
];

export default function PrivacyPage() {
  return (
```

New:
```tsx
  ];

  return (
```

Bagian JSX return (hero/content/related-links, baris 129-231 di file saat ini) **tidak berubah** — cuma bertambah satu level indentasi karena sekarang di dalam function.

- [ ] **Step 3: Ganti seluruh isi `app/(public)/kebijakan-pengembalian/page.tsx`**

Old (bagian awal file, sebelum array `sections`):
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kebijakan Pengembalian",
  description:
    "Kebijakan pengembalian dan penukaran barang GeekyTech. Pelajari syarat, cara pengajuan, dan estimasi waktu pengembalian dana.",
};

const sections = [
```

New (bagian awal file — deklarasi function pindah ke sini, ditambah `async`; nama function `KebijakanPengembalianPage` sudah benar sebelumnya, tidak perlu diganti):
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getWhatsappCs } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Kebijakan Pengembalian",
  description:
    "Kebijakan pengembalian dan penukaran barang GeekyTech. Pelajari syarat, cara pengajuan, dan estimasi waktu pengembalian dana.",
};

export default async function KebijakanPengembalianPage() {
  const whatsappCs = await getWhatsappCs();

  const sections = [
```

Enam section pertama (1-6, isi sama persis seperti file saat ini baris 13-60) disalin apa adanya, hanya bertambah satu level indentasi. Section 7 "Hubungi Kami" diubah:

Old (section 7 saja):
```tsx
  {
    title: "7. Hubungi Kami",
    content: [
      "Untuk pertanyaan atau pengajuan pengembalian, silakan hubungi kami melalui:",
      "Email: support@geekytech.com",
      "WhatsApp: +62 812-3456-7890",
      "Jam operasional: Senin - Minggu, 09:00 - 21:00",
    ],
  },
```

New (section 7 saja — 6 section lainnya persis sama, hanya dipindah ke dalam function):
```tsx
    {
      title: "7. Hubungi Kami",
      content: [
        "Untuk pertanyaan atau pengajuan pengembalian, silakan hubungi kami melalui:",
        "Email: support@geeky.id",
        `WhatsApp: ${whatsappCs ? `+${whatsappCs}` : "Belum diatur"}`,
        "Jam operasional: Senin - Minggu, 09:00 - 21:00",
      ],
    },
```

Setelah penutup array (`];`), hapus baris lama berikut (fungsinya sudah dipindah ke bagian awal file di atas):

Old:
```tsx
];

export default function KebijakanPengembalianPage() {
  return (
```

New:
```tsx
  ];

  return (
```

Bagian JSX return (hero/content/related-links, baris 74-176 di file saat ini) **tidak berubah** — cuma bertambah satu level indentasi.

- [ ] **Step 4: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint "app/(public)/syarat-ketentuan/page.tsx" "app/(public)/kebijakan-privasi/page.tsx" "app/(public)/kebijakan-pengembalian/page.tsx"`
Expected: tidak ada error baru.

- [ ] **Step 5: Verifikasi manual di browser**

Run: `npm run dev`, buka masing-masing dari 3 halaman, scroll ke section "Kontak Kami" paling bawah → email menampilkan `support@geeky.id`, WhatsApp menampilkan nilai dari settings (saat ini placeholder `+6281234567890`, itu wajar — lihat catatan di §Global Constraints).

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/syarat-ketentuan/page.tsx" "app/(public)/kebijakan-privasi/page.tsx" "app/(public)/kebijakan-pengembalian/page.tsx"
git commit -m "feat: WA & email dinamis di halaman syarat ketentuan, privasi, pengembalian"
```

---

## Task 4: Email & WhatsApp Dinamis di Halaman FAQ

**Files:**
- Modify: `app/(public)/faq/page.tsx` (seluruh file, 300 baris)

**Interfaces:**
- Consumes: `getWhatsappCs(): Promise<string>` dari `@/lib/settings/queries`.

- [ ] **Step 1: Tambah import & ubah signature function**

Old:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "FAQ - Pertanyaan Umum",
  description:
    "Jawaban atas pertanyaan umum tentang GeekyTech. Temukan solusi cepat untuk pertanyaanmu.",
};

const faqCategories = [
```

New:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { Button } from "@/components/ui/button";
import { getWhatsappCs } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "FAQ - Pertanyaan Umum",
  description:
    "Jawaban atas pertanyaan umum tentang GeekyTech. Temukan solusi cepat untuk pertanyaanmu.",
};

export default async function FAQPage() {
  const whatsappCs = await getWhatsappCs();
  const waLine = whatsappCs ? `+${whatsappCs}` : "Belum diatur";

  const faqCategories = [
```

Catatan indentasi: seluruh isi array `faqCategories` (semua 7 kategori, baris 13-227 di file saat ini) sekarang berada satu level indentasi lebih dalam (di dalam function), tapi isinya identik KECUALI 2 entry di bawah ini.

- [ ] **Step 2: Ubah entry `other-1` (kategori "Lainnya")**

Old:
```tsx
      {
        id: "other-1",
        question: "Bagaimana cara menghubungi customer service?",
        answer:
          "Hubungi kami melalui:\n- WhatsApp: +62 812-3456-7890\n- Email: support@geekytech.com\n- Form kontak: /contact\nJam operasional: Senin - Minggu, 09:00 - 21:00",
      },
```

New:
```tsx
        {
          id: "other-1",
          question: "Bagaimana cara menghubungi customer service?",
          answer:
            `Hubungi kami melalui:\n- WhatsApp: ${waLine}\n- Email: support@geeky.id\n- Form kontak: /contact\nJam operasional: Senin - Minggu, 09:00 - 21:00`,
        },
```

- [ ] **Step 3: Ubah entry `other-3` (kategori "Lainnya")**

Old:
```tsx
      {
        id: "other-3",
        question: "Bisakah saya menjadi reseller GeekyTech?",
        answer:
          "Kami membuka kesempatan bagi reseller. Jika tertarik, hubungi tim business development kami melalui email support@geekytech.com dengan subjek 'Reseller Program'.",
      },
```

New:
```tsx
        {
          id: "other-3",
          question: "Bisakah saya menjadi reseller GeekyTech?",
          answer:
            "Kami membuka kesempatan bagi reseller. Jika tertarik, hubungi tim business development kami melalui email support@geeky.id dengan subjek 'Reseller Program'.",
        },
```

- [ ] **Step 4: Tutup array & sesuaikan komponen**

Semua entry lain di `faqCategories` (kategori "Tentang GeekyTech", "Produk & Harga", "Pemesanan & Pembayaran", "Pengiriman", "Pengembalian & Garansi", "Akun & Keamanan", dan entry `other-2`, `other-4` di kategori "Lainnya") **disalin persis** dari file saat ini (baris 13-227), hanya berpindah satu level indentasi karena sekarang di dalam function. Tidak ada perubahan isi.

Setelah penutup array, hapus baris lama berikut (fungsinya sudah dipindah ke Step 1):

Old:
```tsx
];

export default function FAQPage() {
  return (
```

New:
```tsx
  ];

  return (
```

Badan JSX (`return (...)`, baris 231-299 di file saat ini) **tidak berubah** — cuma bertambah satu level indentasi, tetap merender `faqCategories.map(...)` seperti sebelumnya.

- [ ] **Step 5: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint "app/(public)/faq/page.tsx"`
Expected: tidak ada error baru.

- [ ] **Step 6: Verifikasi manual di browser**

Run: `npm run dev`, buka `/faq`, buka kategori "Lainnya", cek jawaban "Bagaimana cara menghubungi customer service?" menampilkan email `support@geeky.id` dan WhatsApp dari settings; cek jawaban "Bisakah saya menjadi reseller GeekyTech?" menampilkan `support@geeky.id`. Pastikan 6 kategori lain tidak berubah tampilannya.

- [ ] **Step 7: Commit**

```bash
git add "app/(public)/faq/page.tsx"
git commit -m "feat: WA & email dinamis di halaman FAQ"
```

---

## Task 5: Email & Nama Badan Usaha di Contact/About + Cleanup Domain

**Files:**
- Modify: `app/(public)/contact/page.tsx`
- Modify: `app/(public)/about/page.tsx`
- Modify: `lib/geo/geocode-destination.ts:145`
- Modify: `app/admin/login/page.tsx:115`

**Interfaces:**
- Consumes: `LEGAL_ENTITY_NAME` dari `@/lib/constants/business-identity` (Task 2).

- [ ] **Step 1: Perbaiki email di `app/(public)/contact/page.tsx` + tambah import**

Old:
```tsx
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress, getStoreOriginMapsUrl } from "@/lib/settings/store-origin";
```

New:
```tsx
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress, getStoreOriginMapsUrl } from "@/lib/settings/store-origin";
import { LEGAL_ENTITY_NAME } from "@/lib/constants/business-identity";
```

Old:
```tsx
    {
      icon: Mail,
      title: "Email",
      description: "Kirim email pertanyaanmu",
      value: "support@geekytech.com",
      href: "mailto:support@geekytech.com",
      label: "Kirim Email",
    },
```

New:
```tsx
    {
      icon: Mail,
      title: "Email",
      description: "Kirim email pertanyaanmu",
      value: "support@geeky.id",
      href: "mailto:support@geeky.id",
      label: "Kirim Email",
    },
```

- [ ] **Step 2: Tambah baris nama badan usaha di Hero `contact/page.tsx`**

Old:
```tsx
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto">
            Tim kami siap membantu dengan konsultasi produk, pertanyaan pesanan, atau keluhan apapun. Hubungi kami melalui channel favoritmu.
          </p>
        </div>
      </section>
```

New:
```tsx
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto">
            Tim kami siap membantu dengan konsultasi produk, pertanyaan pesanan, atau keluhan apapun. Hubungi kami melalui channel favoritmu.
          </p>
          <p className="mt-4 text-[13px] text-[#7a7a7a]">
            Dioperasikan oleh {LEGAL_ENTITY_NAME}.
          </p>
        </div>
      </section>
```

- [ ] **Step 3: Tambah baris nama badan usaha di Hero `app/(public)/about/page.tsx`**

Old:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
```

New:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LEGAL_ENTITY_NAME } from "@/lib/constants/business-identity";
```

Old:
```tsx
          <p
            className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto"
          >
            GeekyTech hadir untuk memastikan semua orang bisa mengakses teknologi terbaik dengan mudah, aman, dan terpercaya.
          </p>
        </div>
      </section>
```

New:
```tsx
          <p
            className="text-[17px] font-light leading-[1.5] text-[#1d1d1f][#cccccc] max-w-[600px] mx-auto"
          >
            GeekyTech hadir untuk memastikan semua orang bisa mengakses teknologi terbaik dengan mudah, aman, dan terpercaya.
          </p>
          <p className="mt-4 text-[13px] text-[#7a7a7a][#cccccc]">
            Dioperasikan oleh {LEGAL_ENTITY_NAME}.
          </p>
        </div>
      </section>
```

- [ ] **Step 4: Perbaiki domain di `lib/geo/geocode-destination.ts:145`**

Old:
```ts
          "User-Agent": "GeekyTech/1.0 (geekytech.com)",
```

New:
```ts
          "User-Agent": "GeekyTech/1.0 (geeky.id)",
```

- [ ] **Step 5: Perbaiki placeholder di `app/admin/login/page.tsx:115`**

Old:
```tsx
                        placeholder="admin@geekytech.com"
```

New:
```tsx
                        placeholder="admin@geeky.id"
```

- [ ] **Step 6: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint "app/(public)/contact/page.tsx" "app/(public)/about/page.tsx" lib/geo/geocode-destination.ts app/admin/login/page.tsx`
Expected: tidak ada error baru.

- [ ] **Step 7: Verifikasi manual di browser**

Run: `npm run dev`.
- Buka `/contact` → kartu Email menampilkan `support@geeky.id`; di bawah paragraf hero muncul "Dioperasikan oleh CV. Sentosa Berkat Jaya."
- Buka `/about` → di bawah paragraf hero muncul baris yang sama.
- Buka `/admin/login` → placeholder field email sekarang `admin@geeky.id`.

- [ ] **Step 8: Commit**

```bash
git add "app/(public)/contact/page.tsx" "app/(public)/about/page.tsx" lib/geo/geocode-destination.ts app/admin/login/page.tsx
git commit -m "fix: email geeky.id konsisten + tampilkan nama badan usaha di about & contact"
```

---

## Task 6: Alamat Retur Dinamis di Halaman Komplain

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx`

**Interfaces:**
- Consumes: `getStoreOrigin(): Promise<StoreOrigin>` dari `@/lib/settings/queries`, `getStoreOriginFullAddress(origin): string` dari `@/lib/settings/store-origin`.

- [ ] **Step 1: Tambah import**

Old:
```tsx
import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchComplaintForOrder } from "@/lib/data/complaints";
import { OrderComplaintForm } from "@/components/dashboard/order-complaint-form";
import { ComplaintThread } from "@/components/dashboard/complaint-thread";
import { ReturnAwbForm } from "@/components/dashboard/return-awb-form";
```

New:
```tsx
import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchComplaintForOrder } from "@/lib/data/complaints";
import { OrderComplaintForm } from "@/components/dashboard/order-complaint-form";
import { ComplaintThread } from "@/components/dashboard/complaint-thread";
import { ReturnAwbForm } from "@/components/dashboard/return-awb-form";
import { getStoreOrigin } from "@/lib/settings/queries";
import { getStoreOriginFullAddress } from "@/lib/settings/store-origin";
```

- [ ] **Step 2: Ganti alamat hardcode**

Old:
```tsx
  const ret = complaint.return;
  const returnAddress = "Jl. Contoh No. 123, Jakarta";
```

New:
```tsx
  const ret = complaint.return;
  const storeOrigin = await getStoreOrigin();
  const returnAddress = getStoreOriginFullAddress(storeOrigin);
```

- [ ] **Step 3: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint "app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx"`
Expected: tidak ada error baru.

- [ ] **Step 4: Verifikasi manual di browser**

Prasyarat: cari/buat order dengan complaint berstatus `return_approved` dan `ret.status === "pending_shipback"` supaya blok "Kirim Barang Kembali" tampil (kalau tidak ada data seperti ini di local dev, cukup pastikan `npx tsc --noEmit` bersih dan baca kode untuk konfirmasi logika benar — catat di laporan kalau skenario ini tidak bisa diuji langsung di browser).

Run: `npm run dev`, buka halaman komplain order tersebut → "Alamat pengiriman" menampilkan alamat asli dari `settings.store_origin` (Bellezza Shopping Arcade, dst.), bukan lagi "Jl. Contoh No. 123, Jakarta".

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx"
git commit -m "fix: alamat retur di halaman komplain ambil dari settings, bukan hardcode"
```

---

## Self-Review Notes

- **Spec coverage**: Task 1↔#7, Task 2+5↔#11, Task 3+4↔#8+#9, Task 6↔#10 — semua 5 item spec [2026-07-03-midtrans-audit-items-7-11-design.md](../specs/2026-07-03-midtrans-audit-items-7-11-design.md) punya task yang mengimplementasikannya.
- **Placeholder scan**: tidak ada "TBD"/"implement later" — array besar yang "disalin persis" secara eksplisit dirujuk ke baris file saat ini yang sudah dibaca dan dikutip lengkap di task lain sebagai referensi, bukan diasumsikan.
- **Type consistency**: `getWhatsappCs()`, `getStoreOrigin()`, `getStoreOriginFullAddress()`, `getStoreOriginMapsUrl()`, `LEGAL_ENTITY_NAME` dipakai dengan nama & signature yang sama persis seperti didefinisikan di putaran sebelumnya (Task 1 & 5, blocker round) dan di Task 2 plan ini — dicek konsisten di semua task yang mengonsumsinya.
- **Urutan task**: Task 5 butuh `LEGAL_ENTITY_NAME` dari Task 2 (dependency). Task 1, 3, 4, 6 independen satu sama lain dan terhadap Task 2/5 — bisa dikerjakan kapan saja.
