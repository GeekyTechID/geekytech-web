"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronUp, ChevronDown,
  ImageIcon, Zap, PackageSearch, Star,
  ExternalLink, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { saveHomeSections, type HomeSection, type HomeSectionKey } from "../_actions";

// ── Types ─────────────────────────────────────────────────────────────────
type BannerItem = {
  id: string;
  title: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type FlashSaleItem = {
  id: string;
  name: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  created_at: string;
  product_count: number;
};

type PromoItem = {
  id: string;
  title: string;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  created_at: string;
  product_count: number;
  brand_count: number;
};

interface Props {
  banners: BannerItem[];
  flashSales: FlashSaleItem[];
  secondPromos: PromoItem[];
  featuredPromos: PromoItem[];
  initialSections: HomeSection[];
}

// ── Constants ─────────────────────────────────────────────────────────────
const SECTION_META: Record<HomeSectionKey, {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = {
  main_banner:       { label: "Main Banner",   icon: ImageIcon     },
  flash_sale:        { label: "Flash Sale",    icon: Zap           },
  second_products:   { label: "Produk Second", icon: PackageSearch },
  featured_products: { label: "Rekomendasi",   icon: Star          },
};

// ── Small helpers ─────────────────────────────────────────────────────────
const labelClass = "text-[10px] font-semibold uppercase text-muted-foreground";

function StatusBadge({ active }: { active: boolean }) {
  return <AdminStatusBadge active={active} />;
}

function ThCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground", className)}>
      {children}
    </th>
  );
}

function TdCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}

// ── Group header inside top card ──────────────────────────────────────────
function GroupHeader({
  sectionKey,
  count,
}: {
  sectionKey: HomeSectionKey;
  count: number;
}) {
  const { label, icon: Icon } = SECTION_META[sectionKey];
  return (
    <div className="flex items-center gap-2.5 border-b border-[#e0e0e0] bg-muted/40 px-4 py-2.5 dark:border-border">
      <Icon size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="text-[11px] font-semibold uppercase text-foreground">
        {label}
      </span>
      <span className="ml-auto text-[10px] text-muted-foreground">{count} item</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function HomeSectionsEditor({
  banners,
  flashSales,
  secondPromos,
  featuredPromos,
  initialSections,
}: Props) {
  const [sections, setSections] = useState<HomeSection[]>(initialSections);
  const [isPending, startTransition] = useTransition();

  const activeBannerCount = banners.filter((b) => b.is_active).length;

  // Lookup selected item label for bottom table
  const getSelectedLabel = (section: HomeSection): string => {
    if (section.key === "main_banner") return `${activeBannerCount} banner aktif`;
    if (!section.selected_id) return "Belum dipilih";
    if (section.key === "flash_sale")
      return flashSales.find((f) => f.id === section.selected_id)?.name ?? "—";
    if (section.key === "second_products")
      return secondPromos.find((p) => p.id === section.selected_id)?.title ?? "—";
    if (section.key === "featured_products")
      return featuredPromos.find((p) => p.id === section.selected_id)?.title ?? "—";
    return "—";
  };

  const isSelected = (sectionKey: HomeSectionKey, itemId: string) =>
    sections.find((s) => s.key === sectionKey)?.selected_id === itemId;

  const assignItem = (sectionKey: HomeSectionKey, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey
          ? { ...s, selected_id: s.selected_id === itemId ? null : itemId }
          : s,
      ),
    );
  };

  const toggleActive = (key: HomeSectionKey) => {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, is_active: !s.is_active } : s)),
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveHomeSections(sections);
      if (error) toast.error(error);
      else toast.success("Tampilan beranda disimpan.");
    });
  };

  // ── Pill: Pilih / Dipilih ──────────────────────────────────────────────
  function SelectButton({ sectionKey, itemId }: { sectionKey: HomeSectionKey; itemId: string }) {
    const selected = isSelected(sectionKey, itemId);
    return (
      <button
        type="button"
        onClick={() => assignItem(sectionKey, itemId)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold uppercase transition-colors",
          selected
            ? "bg-brand text-white hover:bg-brand-hover"
            : "border border-[#e0e0e0] text-muted-foreground hover:border-brand/40 hover:text-brand dark:border-border",
        )}
      >
        {selected && <CheckCircle2 size={11} />}
        {selected ? "Dipilih" : "Pilih"}
      </button>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TABLE 1 — Data template promosi
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="border-b border-[#e0e0e0] px-5 py-4 dark:border-border">
          <h2 className="admin-section-title">Data Template Promosi</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Pilih satu konten per seksi untuk ditampilkan di beranda. Klik &ldquo;Pilih&rdquo; untuk menugaskan, klik lagi untuk membatalkan.
          </p>
        </div>

        {/* ── Main Banner ─────────────────────────────────────────────── */}
        <GroupHeader sectionKey="main_banner" count={banners.length} />
        {banners.length === 0 ? (
          <div className="flex items-center justify-between px-4 py-4">
            <p className="text-sm text-muted-foreground">Belum ada banner. </p>
            <Link
              href="/admin/promotions/main-banner"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand underline-offset-2 hover:underline"
            >
              Kelola Banner <ExternalLink size={10} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0] dark:border-border">
                  <ThCell>Judul</ThCell>
                  <ThCell>Urutan</ThCell>
                  <ThCell>Status</ThCell>
                  <ThCell>Dibuat</ThCell>
                  <ThCell className="text-right">
                    <Link
                      href="/admin/promotions/main-banner"
                      className="inline-flex items-center gap-1 normal-case font-medium text-brand hover:underline underline-offset-2"
                    >
                      Kelola <ExternalLink size={10} />
                    </Link>
                  </ThCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
                {banners.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-muted/30">
                    <TdCell>
                      <span className="text-sm font-medium text-foreground">
                        {b.title ?? <span className="italic text-muted-foreground">Tanpa judul</span>}
                      </span>
                    </TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">#{b.sort_order}</span>
                    </TdCell>
                    <TdCell><StatusBadge active={b.is_active} /></TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">{formatDate(b.created_at)}</span>
                    </TdCell>
                    <TdCell className="text-right">
                      <span className="text-[10px] text-muted-foreground">Semua banner aktif tampil otomatis</span>
                    </TdCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Flash Sale ──────────────────────────────────────────────── */}
        <GroupHeader sectionKey="flash_sale" count={flashSales.length} />
        {flashSales.length === 0 ? (
          <div className="flex items-center justify-between px-4 py-4">
            <p className="text-sm text-muted-foreground">Belum ada flash sale.</p>
            <Link
              href="/admin/promotions/flash-sale/new"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand underline-offset-2 hover:underline"
            >
              Buat Flash Sale <ExternalLink size={10} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0] dark:border-border">
                  <ThCell>Nama</ThCell>
                  <ThCell>Periode</ThCell>
                  <ThCell>Produk</ThCell>
                  <ThCell>Status</ThCell>
                  <ThCell>Dibuat</ThCell>
                  <ThCell className="text-right">Aksi</ThCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
                {flashSales.map((f) => (
                  <tr
                    key={f.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      isSelected("flash_sale", f.id) && "bg-brand/[0.04]",
                    )}
                  >
                    <TdCell>
                      <span className="text-sm font-medium text-foreground">{f.name}</span>
                    </TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(f.starts_at)} – {formatDate(f.ends_at)}
                      </span>
                    </TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">{f.product_count} varian</span>
                    </TdCell>
                    <TdCell><StatusBadge active={f.is_active} /></TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">{formatDate(f.created_at)}</span>
                    </TdCell>
                    <TdCell className="text-right">
                      <SelectButton sectionKey="flash_sale" itemId={f.id} />
                    </TdCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Produk Second ───────────────────────────────────────────── */}
        <GroupHeader sectionKey="second_products" count={secondPromos.length} />
        {secondPromos.length === 0 ? (
          <div className="flex items-center justify-between px-4 py-4">
            <p className="text-sm text-muted-foreground">Belum ada promosi produk second.</p>
            <Link
              href="/admin/promotions/second-products/new"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand underline-offset-2 hover:underline"
            >
              Buat Promosi <ExternalLink size={10} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0] dark:border-border">
                  <ThCell>Judul</ThCell>
                  <ThCell>Mode</ThCell>
                  <ThCell>Konten</ThCell>
                  <ThCell>Maks. Tampil</ThCell>
                  <ThCell>Status</ThCell>
                  <ThCell>Dibuat</ThCell>
                  <ThCell className="text-right">Aksi</ThCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
                {secondPromos.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      isSelected("second_products", p.id) && "bg-brand/[0.04]",
                    )}
                  >
                    <TdCell>
                      <span className="text-sm font-medium text-foreground">{p.title}</span>
                    </TdCell>
                    <TdCell>
                      <span className={labelClass}>
                        {p.selection_mode === "manual" ? "Per Produk" : "Per Brand"}
                      </span>
                    </TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">
                        {p.selection_mode === "manual" ? `${p.product_count} produk` : `${p.brand_count} brand`}
                      </span>
                    </TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">{p.max_items} item</span>
                    </TdCell>
                    <TdCell><StatusBadge active={p.is_active} /></TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
                    </TdCell>
                    <TdCell className="text-right">
                      <SelectButton sectionKey="second_products" itemId={p.id} />
                    </TdCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Rekomendasi ─────────────────────────────────────────────── */}
        <GroupHeader sectionKey="featured_products" count={featuredPromos.length} />
        {featuredPromos.length === 0 ? (
          <div className="flex items-center justify-between px-4 py-4">
            <p className="text-sm text-muted-foreground">Belum ada promosi rekomendasi.</p>
            <Link
              href="/admin/promotions/featured-products/new"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand underline-offset-2 hover:underline"
            >
              Buat Promosi <ExternalLink size={10} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0] dark:border-border">
                  <ThCell>Judul</ThCell>
                  <ThCell>Mode</ThCell>
                  <ThCell>Konten</ThCell>
                  <ThCell>Maks. Tampil</ThCell>
                  <ThCell>Status</ThCell>
                  <ThCell>Dibuat</ThCell>
                  <ThCell className="text-right">Aksi</ThCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
                {featuredPromos.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      isSelected("featured_products", p.id) && "bg-brand/[0.04]",
                    )}
                  >
                    <TdCell>
                      <span className="text-sm font-medium text-foreground">{p.title}</span>
                    </TdCell>
                    <TdCell>
                      <span className={labelClass}>
                        {p.selection_mode === "manual" ? "Per Produk" : "Per Brand"}
                      </span>
                    </TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">
                        {p.selection_mode === "manual" ? `${p.product_count} produk` : `${p.brand_count} brand`}
                      </span>
                    </TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">{p.max_items} item</span>
                    </TdCell>
                    <TdCell><StatusBadge active={p.is_active} /></TdCell>
                    <TdCell>
                      <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
                    </TdCell>
                    <TdCell className="text-right">
                      <SelectButton sectionKey="featured_products" itemId={p.id} />
                    </TdCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TABLE 2 — Susunan seksi beranda
      ════════════════════════════════════════════════════════════════════ */}
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="border-b border-[#e0e0e0] px-5 py-4 dark:border-border">
          <h2 className="admin-section-title">Section 4 Beranda</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Atur urutan tampilan section 4 dan aktif/nonaktifkan masing-masing.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
                <ThCell className="w-12">#</ThCell>
                <ThCell className="w-16">Urutan</ThCell>
                <ThCell>Seksi</ThCell>
                <ThCell>Konten Dipilih</ThCell>
                <ThCell className="text-right">Status</ThCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {sections.map((section, index) => {
                const { label, icon: Icon } = SECTION_META[section.key];
                const selectedLabel = getSelectedLabel(section);
                const isNoContent = !section.selected_id && section.key !== "main_banner";
                return (
                  <tr
                    key={section.key}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      !section.is_active && "opacity-50",
                    )}
                  >
                    {/* Order number */}
                    <TdCell>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground">
                        {index + 1}
                      </span>
                    </TdCell>

                    {/* Move buttons */}
                    <TdCell>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(index)}
                          disabled={index === sections.length - 1}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </TdCell>

                    {/* Section name */}
                    <TdCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon size={14} strokeWidth={1.5} className="text-foreground" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                      </div>
                    </TdCell>

                    {/* Selected content */}
                    <TdCell>
                      <span className={cn(
                        "text-sm",
                        isNoContent ? "italic text-muted-foreground" : "text-foreground",
                      )}>
                        {selectedLabel}
                      </span>
                    </TdCell>

                    {/* Active toggle */}
                    <TdCell className="text-right">
                      <StatusPillToggle
                        active={section.is_active}
                        onToggle={() => toggleActive(section.key)}
                        activeLabel="Aktif"
                        inactiveLabel="Nonaktif"
                        size="compact"
                      />
                    </TdCell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </div>
  );
}
