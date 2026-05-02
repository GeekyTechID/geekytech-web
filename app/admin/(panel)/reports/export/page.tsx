"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Users, TrendingUp } from "lucide-react";

type ExportType = "orders" | "customers" | "revenue";

const EXPORTS: {
  type: ExportType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    type: "orders",
    label: "Export Pesanan",
    description:
      "Seluruh data pesanan: nomor order, status, nama penerima, total, ongkir, diskon, dan tanggal.",
    icon: FileSpreadsheet,
  },
  {
    type: "customers",
    label: "Export Pelanggan",
    description:
      "Daftar semua pelanggan terdaftar beserta tanggal bergabung.",
    icon: Users,
  },
  {
    type: "revenue",
    label: "Export Revenue",
    description:
      "Revenue harian dari pesanan yang sudah dibayar, dikelompokkan per hari.",
    icon: TrendingUp,
  },
];

export default function ExportPage() {
  const [loading, setLoading] = useState<ExportType | null>(null);

  const handleDownload = async (type: ExportType) => {
    setLoading(type);
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      if (!res.ok) {
        throw new Error("Export gagal");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      a.download = match?.[1] ?? `export-${type}.csv`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // noop — user will see loading reset
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            Export Data
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Unduh data dalam format CSV
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="flex items-center gap-2 h-9 px-4 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-swiss"
        >
          <ArrowLeft size={13} />
          Kembali
        </Link>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {EXPORTS.map(({ type, label, description, icon: Icon }) => (
          <div
            key={type}
            className="border border-border bg-background p-5 flex flex-col gap-4"
          >
            <div className="w-10 h-10 bg-muted flex items-center justify-center">
              <Icon size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-black uppercase tracking-tight">
                {label}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
            <button
              onClick={() => handleDownload(type)}
              disabled={loading !== null}
              className="flex items-center justify-center gap-2 h-9 px-4 bg-swiss-black text-swiss-white text-xs font-bold uppercase tracking-widest transition-swiss disabled:opacity-40 disabled:cursor-not-allowed w-full"
            >
              {loading === type ? (
                <span className="inline-block w-3 h-3 border border-background/40 border-t-background rounded-full animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {loading === type ? "Mengunduh..." : "Unduh CSV"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
